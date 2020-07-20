const simyo = require('../models/simyo')

const router = app => {
  // Just to check that the API works
  app.get('/test', async (request, response) => {
    response.send({ success: true })
  })
  // Gets the data consumption statistics
  app.get('/stats', async (request, response) => {
    const reply = {}
    try {
      reply.success = true
      reply.result = await simyo.usageStats()
    } catch (error) {
      console.log(error)
      reply.success = false
      reply.message = error.message
    }
    response.send(reply)
  })
}

module.exports = router
