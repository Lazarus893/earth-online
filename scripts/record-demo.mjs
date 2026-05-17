/**
 * Earth Online Demo 录屏脚本
 *
 * 使用 Playwright headed 模式录制真实浏览器操作。
 * 运行前确保: npm run dev (port 5173) 正在运行
 *
 * 使用方法:
 *   npx playwright test scripts/record-demo.mjs --headed
 *   或者直接: node scripts/record-demo.mjs
 */

import { chromium } from 'playwright'
import { join } from 'path'

const BASE_URL = 'http://localhost:5173'
const OUTPUT_DIR = join(import.meta.dirname, '..', 'demo-recordings')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const { mkdirSync } = await import('fs')
  mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('🎬 Starting Earth Online demo recording...')
  console.log(`   Output: ${OUTPUT_DIR}`)
  console.log('')

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1280,800'],
  })

  // ─── Scene 1: Onboarding ───
  console.log('📹 Scene 1: Onboarding questionnaire')
  const ctx1 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1280, height: 800 } },
  })
  const page1 = await ctx1.newPage()

  // 清理旧数据确保从头开始
  await page1.goto(BASE_URL)
  await page1.evaluate(() => localStorage.clear())
  await page1.reload()
  await sleep(1500)

  // 欢迎页 → 点击 INITIALIZE
  await page1.click('button:has-text("INITIALIZE")')
  await sleep(1000)

  // 快速完成 8 道题（每道选第一个选项）
  for (let i = 0; i < 8; i++) {
    await sleep(800)
    const buttons = await page1.$$('.dimension-orbit-card, button[class*="relative w-full"]')
    const optionBtn = await page1.$('button:nth-of-type(1)')
    if (optionBtn) {
      await optionBtn.click()
    } else {
      // 备选：点击第一个可交互元素
      await page1.click('[class*="relative w-full text-left"]:first-of-type')
    }
    await sleep(600)
  }

  // 等待扫描动画 + 抽卡揭晓
  await sleep(3000)  // 扫描动画
  await sleep(10000) // 5张卡 × 1.8s 每张

  // 点击"开始冒险"
  await sleep(2000)
  const startBtn = await page1.$('button:has-text("开始冒险")')
  if (startBtn) await startBtn.click()
  await sleep(2000)

  await ctx1.close()
  console.log('   ✅ Scene 1 done')

  // ─── Scene 2: Dashboard + Quest Complete ───
  console.log('📹 Scene 2: Dashboard & Quest interaction')
  const ctx2 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1280, height: 800 } },
  })
  const page2 = await ctx2.newPage()
  await page2.goto(BASE_URL)
  await sleep(2000)

  // 点击完成一个任务
  const questItem = await page2.$('.quest-board__item:not(.is-done)')
  if (questItem) {
    await questItem.click()
    await sleep(2000) // 等通知横幅
  }

  await sleep(3000) // 展示 Dashboard 全貌

  await ctx2.close()
  console.log('   ✅ Scene 2 done')

  // ─── Scene 3: Dimension Transition ───
  console.log('📹 Scene 3: Persona-style transition')
  const ctx3 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1280, height: 800 } },
  })
  const page3 = await ctx3.newPage()
  await page3.goto(BASE_URL)
  await sleep(2000)

  // 点击 Physical 维度卡
  const dimCard = await page3.$('.dashboard-node--physical .dimension-orbit-card')
  if (dimCard) {
    await dimCard.click()
    await sleep(12000) // VD01 + VD09 + 揭示动画
  }

  await sleep(3000) // 详情页加载 + AI Advisor

  await ctx3.close()
  console.log('   ✅ Scene 3 done')

  // ─── Scene 4: Dimension Detail + AI Advisor ───
  console.log('📹 Scene 4: AI Advisor panel')
  const ctx4 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1280, height: 800 } },
  })
  const page4 = await ctx4.newPage()

  // 直接导航到详情页（跳过转场节省时间）
  await page4.goto(BASE_URL)
  await sleep(1000)
  await page4.evaluate(() => {
    // 模拟已在详情页
  })

  // 点击维度进入
  const dimCard2 = await page4.$('.dashboard-node--physical .dimension-orbit-card')
  if (dimCard2) {
    await dimCard2.click()
    await sleep(12000) // 转场
  }

  // 等 AI Advisor 加载
  await sleep(8000)

  // 完成一个行动
  const actionItem = await page4.$('.advisor-action:not(.is-done)')
  if (actionItem) {
    await actionItem.click()
    await sleep(2000)
  }

  // 点击返回
  await sleep(2000)
  const backBtn = await page4.$('.detail-page__back')
  if (backBtn) {
    await backBtn.click()
    await sleep(4000) // VD12 退出转场
  }

  await ctx4.close()
  console.log('   ✅ Scene 4 done')

  await browser.close()

  console.log('')
  console.log('🎉 All scenes recorded!')
  console.log(`   Files in: ${OUTPUT_DIR}`)
  console.log('')
  console.log('To combine with ffmpeg:')
  console.log(`   cd ${OUTPUT_DIR}`)
  console.log('   # List recordings:')
  console.log('   ls -la *.webm')
  console.log('   # Combine (adjust filenames):')
  console.log('   ffmpeg -i scene1.webm -i scene2.webm -i scene3.webm -i scene4.webm \\')
  console.log('     -filter_complex "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0" \\')
  console.log('     -c:v libx264 -preset fast -crf 23 earth-online-demo.mp4')
}

main().catch(err => {
  console.error('❌ Recording failed:', err)
  process.exit(1)
})
