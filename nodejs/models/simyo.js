require('dotenv').config()
const puppeteer = require('puppeteer')

const usageStats = async () => {
  // Browser configuration
  const browser = await puppeteer.launch({ ignoreHTTPSErrors: true, headless: true, args: ['--no-sandbox', '--lang es'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 720 })

  await page.goto('https://www.simyo.es/simyo/login')
  const login = async () => {
    await page.waitFor(4000)
    await page.click('#username')
    await page.keyboard.type(process.env.SIMYO_USERNAME, { delay: 100 })
    await page.click('#password')
    await page.keyboard.type(process.env.SIMYO_PASSWORD, { delay: 100 })
    await page.click('#submitButton')
    await page.goto('https://www.simyo.es/simyo/privatearea/customer/consumption-panel')
  }
  // Four login trials, website is a bit buggy
  for (let i = 0; i < 4; i++) {
    if (!await page.$('#username')) break
    await login()
  }

  // Gets the raw html
  const bodyHTML = await page.evaluate(() => document.documentElement.innerHTML)
  // Close the browser to save resources
  await browser.close()
  // Extracts the JSON included in the HTML
  const consumptionDataTest = bodyHTML.match(/var consumptionInfo = ({.*);/)
  if (!consumptionDataTest) {
    throw new Error('No se han podido parsear el html de las estadísticas de Simyo. Posiblemente no estés logueado')
  }
  const consumptionData = JSON.parse(consumptionDataTest[1])
  // Data left and days calculation
  const billCycleDay = consumptionData.billCycleType
  let limitData = 0
  let spentData = 0
  for (const dataBundle of consumptionData.dataBundles) {
    limitData += dataBundle.limit
    spentData += dataBundle.spent
  }
  const percentage = (spentData / limitData) * 100
  const percentageFormatted = Math.round(percentage)
  const limitDataFormatted = Math.round((limitData / 1000000000))
  const spentDataFormatted = Math.round((spentData / 1000000000))

  const dayOfTheMonth = new Date().getDate()
  let daysUntilNextCycle
  if (dayOfTheMonth <= billCycleDay) {
    daysUntilNextCycle = billCycleDay - dayOfTheMonth
  } else {
    const today = new Date()
    const currentCycle = new Date().setDate(today.getDate() - (dayOfTheMonth - billCycleDay))
    const nextCycle = new Date(currentCycle.setMonth(currentCycle.getMonth() + 1))
    daysUntilNextCycle = Math.ceil((nextCycle - today) / (1000 * 60 * 60 * 24))
  }
  // Logging
  console.log(new Date(), 'Correct data')
  return {
    billCycleDay: billCycleDay,
    daysUntilNextCycle: daysUntilNextCycle,
    percentage: percentage,
    limitData: limitData,
    spentData: spentData,
    percentageFormatted: percentageFormatted,
    limitDataFormatted: limitDataFormatted,
    spentDataFormatted: spentDataFormatted
  }
}

// Testing from the command line. Usage: node simyo.js test
if (process.argv[2]) {
  console.log(usageStats(process.argv[2]))
}

module.exports = {
  usageStats
}
