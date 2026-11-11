import test from 'node:test'
import assert from 'node:assert/strict'
import SupportEmailService from '../services/SupportEmailService.js'

test('sends verification codes through the configured transporter', async () => {
  const originalFrom = process.env.SMTP_FROM
  process.env.SMTP_FROM = 'support@example.com'

  let message
  const service = new SupportEmailService({
    transporter: {
      sendMail: async (outgoingMessage) => {
        message = outgoingMessage
        return { accepted: [outgoingMessage.to] }
      }
    }
  })

  try {
    const result = await service.sendVerificationCode('customer@example.com', '123456')

    assert.deepEqual(result.accepted, ['customer@example.com'])
    assert.equal(message.to, 'customer@example.com')
    assert.match(message.text, /123456/)
    assert.match(message.html, /123456/)
  } finally {
    if (originalFrom === undefined) {
      delete process.env.SMTP_FROM
    } else {
      process.env.SMTP_FROM = originalFrom
    }
  }
})
