/**
 * gzh-design 主题同步脚本
 * 从 skill 仓库目录复制主题文件到项目内
 *
 * 用法: npx tsx scripts/sync-gzh-themes.ts [skill-path]
 */
import * as fs from 'fs';
import * as path from 'path';

const SKILL_PATH = process.argv[2] || process.env.GZH_DESIGN_SKILL_PATH || 'C:\\Users\\User\\.claude\\skills\\gzh-design';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(PROJECT_ROOT, 'src', 'data', 'gzh-themes', 'raw');
const GALLERY_DIR = path.join(PROJECT_ROOT, 'public', 'gzh-gallery');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src: string, dest: string) {
  fs.copyFileSync(src, dest);
  console.log(`  ✓ ${path.basename(src)}`);
}

function main() {
  console.log('🔄 同步 gzh-design 主题文件...');
  console.log(`   源: ${SKILL_PATH}`);

  const refsDir = path.join(SKILL_PATH, 'references');
  if (!fs.existsSync(path.join(refsDir, 'theme-index.md'))) {
    console.error(`❌ 找不到 theme-index.md，请确认路径: ${refsDir}`);
    process.exit(1);
  }

  // 1. 复制 references/*.md 到 raw/
  ensureDir(RAW_DIR);
  const refFiles = fs.readdirSync(refsDir).filter(f => f.endsWith('.md'));
  console.log('\n📖 复制主题参考文件:');
  for (const f of refFiles) {
    copyFile(path.join(refsDir, f), path.join(RAW_DIR, f));
  }

  // 2. 复制 gallery HTML 文件
  const gallerySrc = path.join(SKILL_PATH, 'docs', 'gallery');
  ensureDir(GALLERY_DIR);
  if (fs.existsSync(gallerySrc)) {
    console.log('\n🖼️ 复制主题预览文件:');
    const galleryFiles = fs.readdirSync(gallerySrc).filter(f => f.endsWith('.html'));
    for (const f of galleryFiles) {
      copyFile(path.join(gallerySrc, f), path.join(GALLERY_DIR, f));
    }
  }

  // 3. 记录版本信息
  const gitDir = path.join(SKILL_PATH, '.git');
  let version = new Date().toISOString().split('T')[0];
  try {
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf-8').trim();
    if (head.startsWith('ref: ')) {
      const refPath = head.slice(5);
      const commit = fs.readFileSync(path.join(gitDir, refPath), 'utf-8').trim().slice(0, 8);
      version = commit;
    }
  } catch {
    // 没有git信息就用日期
  }
  fs.writeFileSync(path.join(RAW_DIR, '.version'), version);
  console.log(`\n🏷️ 版本: ${version}`);

  // 4. 运行解析器
  console.log('\n⚙️ 运行主题解析器...');
  try {
    // 动态导入解析脚本
    const parseScript = path.join(PROJECT_ROOT, 'scripts', 'parse-themes.ts');
    if (fs.existsSync(parseScript)) {
      console.log('   请运行: npx tsx scripts/parse-themes.ts');
    }
  } catch (e) {
    console.error('   解析器执行失败:', e);
  }

  console.log('\n✅ 同步完成！');
}

main();
