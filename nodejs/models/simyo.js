require('dotenv').config()
const puppeteer = require('puppeteer')

const usageStats = async () => {
  console.log('> Scraping data', new Date())
  // Browser configuration:
  // I use a custom Chromium since I use a Raspberry. For the rest of the cases, use the auto downloaded Chromuim (remove the executablePath field)
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser', ignoreHTTPSErrors: true, headless: true, args: ['--no-sandbox', '--lang es'] })
  let bodyHTML
  try {
    // Open a new browser page navigate
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    await page.goto('https://www.simyo.es/simyo/login')
    // Login as a real user would do
    const login = async () => {
      await page.waitFor(4000)
      await page.click('#username')
      await page.keyboard.type(process.env.SIMYO_USERNAME, { delay: 75 })
      await page.click('#password')
      await page.keyboard.type(process.env.SIMYO_PASSWORD, { delay: 75 })
      await page.click('#submitButton')
      await page.goto('https://www.simyo.es/simyo/privatearea/customer/consumption-panel')
    }
    // Four login trials, website is a bit buggy
    for (let i = 0; i < 4; i++) {
      if (!await page.$('#username')) break
      await login()
    }
    // Gets the raw html
    bodyHTML = await page.evaluate(() => document.documentElement.innerHTML)
  } catch (error) {
    throw new Error('Puppeteer Error, closing.')
  } finally {
    // Always close the browser to save resources
    await browser.close()
  }
  // Extracts the JSON included in the HTML
  const consumptionDataTest = bodyHTML.match(/var consumptionInfo = ({.*);/)
  if (!consumptionDataTest) {
    throw new Error('Statistics were not found in the HTML. You are probably not logged in.')
  }
  const consumptionData = JSON.parse(consumptionDataTest[1])
  // Data left and days calculation
  const billCycleDay = consumptionData.billCycleType
  let limitData = 0
  let spentData = 0
  if (isIterable(consumptionData.dataBundles)) {
    for (const dataBundle of consumptionData.dataBundles) {
      if (dataBundle.limitFormatted.unit === 'GB' || dataBundle.spentFormatted.unit === 'GB') {
        limitData += dataBundle.limitFormatted.size
        spentData += dataBundle.spentFormatted.size
      }
    }
  }
  if (isIterable(consumptionData.dataMgmBundles)) {
    for (const dataBundle of consumptionData.dataMgmBundles) {
      if (dataBundle.limitFormatted.unit === 'GB' || dataBundle.spentFormatted.unit === 'GB') {
        limitData += dataBundle.limitFormatted.size
        spentData += dataBundle.spentFormatted.size
      }
    }
  }
  if (isIterable(consumptionData.dataBundlesRollover)) {
    for (const dataBundle of consumptionData.dataBundlesRollover) {
      if (dataBundle.limitFormatted.unit === 'GB' || dataBundle.spentFormatted.unit === 'GB') {
        limitData += dataBundle.limitFormatted.size
        spentData += dataBundle.spentFormatted.size
      }
    }
  }
  if (isIterable(consumptionData.dataBundlesNight)) {
    for (const dataBundle of consumptionData.dataBundlesNight) {
      if (dataBundle.limitFormatted.unit === 'GB' || dataBundle.spentFormatted.unit === 'GB') {
        limitData += dataBundle.limitFormatted.size
        spentData += dataBundle.spentFormatted.size
      }
    }
  }
  if (isIterable(consumptionData.dataBundlesWeekend)) {
    for (const dataBundle of consumptionData.dataBundlesWeekend) {
      if (dataBundle.limitFormatted.unit === 'GB' || dataBundle.spentFormatted.unit === 'GB') {
        limitData += dataBundle.limitFormatted.size
        spentData += dataBundle.spentFormatted.size
      }
    }
  }
  if (isIterable(consumptionData.dataBundlesExtra)) {
    for (const dataBundle of consumptionData.dataBundlesExtra) {
      if (dataBundle.limitFormatted.unit === 'GB' || dataBundle.spentFormatted.unit === 'GB') {
        limitData += dataBundle.limitFormatted.size
        spentData += dataBundle.spentFormatted.size
      }
    }
  }
  if (isIterable(consumptionData.dataBundlesExtraSpecial)) {
    for (const dataBundle of consumptionData.dataBundlesExtraSpecial) {
      if (dataBundle.limitFormatted.unit === 'GB' || dataBundle.spentFormatted.unit === 'GB') {
        limitData += dataBundle.limitFormatted.size
        spentData += dataBundle.spentFormatted.size
      }
    }
  }
  const percentage = (spentData / limitData) * 100
  const percentageFormatted = Math.round(percentage)
  const limitDataFormatted = Math.round(limitData) // Old approxmiation: Math.round((limitData / 1000000000))
  const spentDataFormatted = Math.round(spentData) // Old approxmiation: Math.round((spentData / 1000000000))

  const dayOfTheMonth = new Date().getDate()
  let daysUntilNextCycle
  if (dayOfTheMonth <= billCycleDay) {
    daysUntilNextCycle = billCycleDay - dayOfTheMonth
  } else {
    const today = new Date()
    const currentCycle = new Date(new Date().setDate(today.getDate() - (dayOfTheMonth - billCycleDay)))
    const nextCycle = new Date(currentCycle.setMonth(currentCycle.getMonth() + 1))
    daysUntilNextCycle = Math.ceil((nextCycle - today) / (1000 * 60 * 60 * 24))
  }
  console.log('< Correct data', new Date())
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

// https://stackoverflow.com/questions/18884249/checking-whether-something-is-iterable
const isIterable = (obj) => {
  // checks for null and undefined
  if (obj == null) {
    return false
  }
  return typeof obj[Symbol.iterator] === 'function'
}

// Testing from the command line. Usage: node simyo.js test
if (process.argv[2]) {
  console.log(usageStats(process.argv[2]))
}

module.exports = {
  usageStats
}
