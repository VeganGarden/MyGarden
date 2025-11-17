/**
 * 溯源证书查看页
 */

import { traceCertificateAPI } from '@/services/traceability'
import { ArrowLeftOutlined, DownloadOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Card, Col, Descriptions, Row, Space, Spin, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useMemo, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useNavigate, useParams } from 'react-router-dom'
import './CertificateView.css'
import './PdfViewer.css'

// 配置 PDF.js worker - 使用 CDN（最可靠的方式）
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

const CertificateViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [certificate, setCertificate] = useState<any>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)
  const [browserType, setBrowserType] = useState<'chrome' | 'safari' | 'other'>('other')
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)

  // 检测浏览器类型
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('chrome') || userAgent.includes('edg')) {
      setBrowserType('chrome')
    } else if (userAgent.includes('safari')) {
      setBrowserType('safari')
    } else {
      setBrowserType('other')
    }
  }, [])

  // Memoize PDF options
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    disableAutoFetch: false,
    disableStream: false,
    disableRange: false,
    verbosity: 0,
  }), [])

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await traceCertificateAPI.get(id, 'default')
      if (result.success && result.data) {
        setCertificate(result.data)
      } else {
        message.error(result.error || '加载失败')
        navigate('/traceability/certificates')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (certificate?.certificateUrl) {
      window.open(certificate.certificateUrl, '_blank')
    } else {
      message.warning('证书文件不存在')
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPdfLoading(false)
    setPdfError(null)
    if (pageNumber > numPages) {
      setPageNumber(1)
    }
  }

  const onDocumentLoadError = (error: Error) => {
    let errorMessage = 'PDF文件加载失败'
    const errorStr = error.message || error.toString() || ''
    
    if (errorStr.includes('CORS') || errorStr.includes('Access-Control-Allow-Origin')) {
      errorMessage = 'PDF文件加载失败：跨域访问被阻止（CORS限制）'
    } else if (errorStr.includes('Failed to fetch') || errorStr.includes('ERR_FAILED')) {
      errorMessage = 'PDF文件加载失败：无法获取文件，可能是CORS限制或网络问题'
    } else {
      errorMessage = `PDF文件加载失败：${errorStr}`
    }
    
    setPdfError(errorMessage)
    setPdfLoading(false)
    
    // 尝试使用fetch+Blob URL作为备用方案
    if (certificate?.certificateUrl) {
      fetch(certificate.certificateUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/pdf',
        },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.blob()
        })
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob)
          setPdfBlobUrl(blobUrl)
          setUseFallback(true)
          setPdfLoading(false)
          setPdfError(null)
        })
        .catch(() => {
          setPdfError('无法加载PDF文件，请尝试下载后查看')
          setUseFallback(true)
        })
    } else {
      setUseFallback(true)
    }
  }

  // 清理Blob URL
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
      }
    }
  }, [pdfBlobUrl])

  useEffect(() => {
    if (certificate?.certificateUrl && certificate?.format === 'pdf') {
      setPageNumber(1)
      setNumPages(0)
      setPdfLoading(true)
      setPdfError(null)
      setUseFallback(false)
    }
  }, [certificate?.certificateUrl, certificate?.format, browserType])

  // 添加容器尺寸状态
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const containerRef = React.useRef<HTMLDivElement>(null)

  // 监听容器尺寸变化
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        // 确保容器有足够的高度显示完整PDF内容
        const availableHeight = window.innerHeight * 0.7 // 使用视口高度的70%
        setContainerSize({
          width: rect.width - 32, // 减去padding
          height: Math.max(availableHeight, 600) // 确保最小高度
        })
      }
    }

    // 初始尺寸
    updateContainerSize()
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateContainerSize)
    return () => window.removeEventListener('resize', updateContainerSize)
  }, [])

  // 添加页面渲染状态跟踪
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set())
  const [pageRenderKey, setPageRenderKey] = useState(0)
  const [isPageChanging, setIsPageChanging] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // 页面渲染成功回调
  const handlePageRenderSuccess = (pageNum: number) => {
    setRenderedPages(prev => new Set(prev).add(pageNum))
    console.log('第', pageNum, '页渲染成功')
    setIsPageChanging(false)
  }

  // 监听pageNumber变化，确保页面正确切换
  useEffect(() => {
    if (numPages > 0 && pageNumber >= 1 && pageNumber <= numPages) {
      // 页面切换时显示加载状态
      setIsPageChanging(true)
      setCurrentPage(pageNumber)
      // 更新渲染key，强制重新渲染
      setPageRenderKey(prev => prev + 1)
      // 短暂延迟后隐藏加载状态
      const timer = setTimeout(() => {
        setIsPageChanging(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [pageNumber, numPages])

  // 确保页面切换后正确渲染
  useEffect(() => {
    if (numPages > 0 && pageNumber !== currentPage) {
      setIsPageChanging(true);
      setCurrentPage(pageNumber);
      // 短暂延迟后隐藏加载状态
      const timer = setTimeout(() => {
        setIsPageChanging(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pageNumber, numPages, currentPage])

  // 重置页面状态当PDF加载成功时
  useEffect(() => {
    if (numPages > 0) {
      setPdfLoading(false)
      setPdfError(null)
    }
  }, [numPages])

  // 计算PDF页面最佳尺寸
  const calculatePageScale = (pageWidth: number, pageHeight: number) => {
    if (!containerSize.width || !containerSize.height) return 1.0
    
    const widthScale = containerSize.width / pageWidth
    const heightScale = containerSize.height / pageHeight
    
    // 使用较小的缩放比例，确保整个页面都能显示
    return Math.min(widthScale, heightScale, 1.0)
  }

  if (!certificate) {
    return <div>加载中...</div>
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/certificates')}>
            返回
          </Button>
          <span>溯源证书</span>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            下载证书
          </Button>
          <Button icon={<ShareAltOutlined />}>
            分享
          </Button>
        </Space>
      }
      loading={loading}
    >
      <Row gutter={16} style={{ width: '100%', margin: 0 }}>
        <Col span={16} style={{ padding: 0, width: '66.666667%', maxWidth: '66.666667%', boxSizing: 'border-box' }}>
          {certificate.certificateUrl ? (
            <div style={{ 
              border: '1px solid #d9d9d9', 
              padding: '0', 
              backgroundColor: '#f5f5f5', 
              width: '100%', 
              boxSizing: 'border-box', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {certificate.format === 'pdf' ? (
                <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ 
                    padding: '16px', 
                    textAlign: 'center',
                    borderBottom: '1px solid #d9d9d9',
                    backgroundColor: '#fff'
                  }}>
                    <Space>
                      <Button
                        disabled={pageNumber <= 1 || numPages === 0}
                        onClick={() => {
                          if (pageNumber > 1) {
                            setPageNumber(pageNumber - 1)
                          }
                        }}
                      >
                        上一页
                      </Button>
                      <span>
                        第 {pageNumber} 页 / 共 {numPages || 0} 页
                      </span>
                      <Button
                        disabled={pageNumber >= numPages || numPages === 0}
                        onClick={() => {
                          if (pageNumber < numPages) {
                            setPageNumber(pageNumber + 1)
                          }
                        }}
                      >
                        下一页
                      </Button>
                    </Space>
                  </div>
                  <div 
                    ref={containerRef}
                    className="pdf-container"
                    style={{ 
                      width: '100%', 
                      flex: 1,
                      minHeight: '600px',
                      height: '70vh', // 使用视口高度的70%
                      boxSizing: 'border-box', 
                      position: 'relative', 
                      backgroundColor: '#f5f5f5'
                    }}>
                    <Spin spinning={pdfLoading} tip={pdfLoading ? '加载中...' : undefined}>
                      {useFallback ? (
                        <div style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}>
                          {pdfError && (
                            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: 16 }}>
                              <p style={{ color: '#856404', marginBottom: 8, fontWeight: 'bold' }}>⚠️ PDF预览加载失败</p>
                              <p style={{ color: '#856404', fontSize: '12px', marginBottom: 0 }}>{pdfError}</p>
                            </div>
                          )}
                          <div style={{ padding: 0, backgroundColor: 'transparent', borderRadius: 0, border: 'none', width: '100%', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                            {useFallback && pdfBlobUrl ? (
                              <iframe
                                src={`${pdfBlobUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                                style={{ 
                                  width: '100%', 
                                  height: '100%',
                                  border: 'none',
                                  outline: 'none',
                                  display: 'block',
                                  boxSizing: 'border-box',
                                  margin: 0,
                                  padding: 0,
                                  backgroundColor: 'transparent'
                                }}
                                title="证书PDF"
                                frameBorder="0"
                              />
                            ) : useFallback && !pdfBlobUrl ? (
                              browserType === 'chrome' ? (
                                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                  <p style={{ color: '#666', marginBottom: 16 }}>PDF无法在此浏览器中显示</p>
                                  <p style={{ color: '#999', fontSize: '12px', marginBottom: 16 }}>
                                    可能是CORS限制，请下载后查看
                                  </p>
                                  <Button 
                                    type="primary" 
                                    icon={<DownloadOutlined />} 
                                    onClick={handleDownload}
                                  >
                                    下载证书查看
                                  </Button>
                                </div>
                              ) : null
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="pdf-document-container">
                          {isPageChanging && (
                            <div className="page-loading-overlay">
                              <Spin size="large" />
                              <span style={{ marginLeft: 16 }}>切换页面中...</span>
                            </div>
                          )}
                          <Document
                            file={certificate.certificateUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={
                              <div style={{ textAlign: 'center', padding: '50px', width: '100%' }}>
                                <Spin size="large" />
                                <p style={{ marginTop: 16 }}>正在加载PDF...</p>
                              </div>
                            }
                            options={pdfOptions}
                          >
                            {numPages > 0 && pageNumber >= 1 && pageNumber <= numPages && (
                              <div className="pdf-pages-container" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                                <Page
                                  key={`page-${pageNumber}-${pageRenderKey}`}
                                  pageNumber={pageNumber}
                                  width={Math.min(800, containerSize.width || 800)}
                                  renderTextLayer={true}
                                  renderAnnotationLayer={true}
                                  onRenderError={(error) => {
                                    console.error('第', pageNumber, '页渲染失败:', error)
                                  }}
                                  onRenderSuccess={() => {
                                    handlePageRenderSuccess(pageNumber)
                                  }}
                                  loading={
                                    <div style={{ textAlign: 'center', padding: '20px', width: '100%' }}>
                                      <Spin />
                                      <p style={{ marginTop: 8, fontSize: '12px' }}>正在加载第 {pageNumber} 页...</p>
                                    </div>
                                  }
                                  className="pdf-page"
                                />
                              </div>
                            )}
                          </Document>
                        </div>
                      )}
                    </Spin>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'clamp(16px, 3vh, 32px)' }}>
                  <img
                    src={certificate.certificateUrl}
                    alt="证书图片"
                    style={{ maxWidth: '100%', height: 'auto' }}
                    onError={() => {
                      message.error('证书图片加载失败')
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <p>证书PDF文件尚未生成</p>
              <p style={{ color: '#999', fontSize: '12px' }}>请联系管理员生成证书</p>
            </div>
          )}
        </Col>
        <Col span={8}>
          <Card title="证书信息" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="证书编号">
                {certificate.certificateNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="生成时间">
                {certificate.createdAt ? dayjs(certificate.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <span style={{ color: certificate.status === 'active' ? '#52c41a' : '#999' }}>
                  {certificate.status === 'active' ? '有效' : '无效'}
                </span>
              </Descriptions.Item>
            </Descriptions>
            {certificate.qrCode && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <img src={certificate.qrCode} alt="证书二维码" style={{ maxWidth: '100%' }} />
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Card>
  )
}

export default CertificateViewPage
