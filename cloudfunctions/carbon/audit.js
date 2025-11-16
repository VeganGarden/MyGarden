function buildAuditData(input) {
  const {
    module = 'system',
    action = 'unknown',
    resource = '',
    description = '',
    status = 'success',
    user = {},
    tenantId = null,
    ip = '',
    userAgent = '',
  } = input || {}

  return {
    userId: user._id || user.userId || null,
    username: user.username || '',
    role: user.role || '',
    action,
    resource,
    module,
    description,
    ip: ip || '',
    userAgent: userAgent || '',
    tenantId: tenantId ?? user.tenantId ?? null,
    status,
    createdAt: new Date(),
  }
}

async function addAudit(db, input) {
  try {
    const data = buildAuditData(input)
    await db.collection('audit_logs').add({ data })
  } catch (_) {}
}

module.exports = { addAudit }


