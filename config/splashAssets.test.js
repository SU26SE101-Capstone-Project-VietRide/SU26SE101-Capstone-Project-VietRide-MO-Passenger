const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { PNG } = require('pngjs');

const appConfig = require('../app.config');

const projectRoot = path.resolve(__dirname, '..');
const generatorPath = path.join(projectRoot, 'scripts', 'generate-app-icons.py');
const generatorRequirementsPath = path.join(
  projectRoot,
  'scripts',
  'requirements-icons.txt',
);
const splashSourcePath = path.join(
  projectRoot,
  'src',
  'assets',
  'images',
  'app_icon_adaptive_foreground.png',
);

const densityCases = [
  ['mdpi', 160, '4ce8b4d547e2cb61233e94575ae904081c1da1e1dcf1dafa34f47a5db40f50bf'],
  ['hdpi', 240, 'e8dbf12077bb2c8aed1dcf32cb068597cd14294592934d303883d1a56067cb7b'],
  ['xhdpi', 320, '30781db2f8eaf8f56ee9fa53a13776d78314c938273d6ccbda9383bd82886b03'],
  ['xxhdpi', 480, '6106df03c77e228cffbf1d9ea9642527776dc545a00f7b853ec58c1a796ef2f7'],
  ['xxxhdpi', 640, '8c2bbee983a0831c3494c58c6fc2c4732baa4988d1398b9258ed29c1c27f61f0'],
];

const alphaBounds = (png) => {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[((y * png.width) + x) * 4 + 3];
      if (alpha === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY };
};

describe('native splash assets', () => {
  it('uses the padded adaptive foreground without changing launcher or notification sources', () => {
    expect(appConfig.splash).toEqual({
      image: './src/assets/images/app_icon_adaptive_foreground.png',
      resizeMode: 'contain',
      backgroundColor: '#EFF7F8',
    });
    expect(appConfig.android.adaptiveIcon).toEqual({
      foregroundImage: './src/assets/images/app_logo_placeholder.png',
      backgroundColor: '#EFF7F8',
    });
    expect(appConfig.notification).toEqual({
      icon: './src/assets/images/app_logo_placeholder.png',
      color: '#007D78',
    });
  });

  it('preserves the padded safe zone when regenerating Android splash images', () => {
    const generator = fs.readFileSync(generatorPath, 'utf8');
    const requirements = fs.readFileSync(generatorRequirementsPath, 'utf8').trim();

    expect(requirements).toBe('Pillow==12.3.0');
    expect(generator).toContain('EXPECTED_PILLOW_VERSION = "12.3.0"');
    expect(generator).toContain(
      'SPLASH_SOURCE = IMAGES / "app_icon_adaptive_foreground.png"',
    );
    expect(generator).toContain(
      'splash_logo = Image.open(SPLASH_SOURCE).convert("RGBA")',
    );
    expect(generator).toContain(
      'splash = contain(splash_logo, int(160 * scale))',
    );
    expect(generator).not.toContain(
      'splash = contain(logo, int(160 * scale))',
    );
  });

  it('keeps the source artwork inside the adaptive safe zone', () => {
    const source = PNG.sync.read(fs.readFileSync(splashSourcePath));
    const bounds = alphaBounds(source);
    const minimumMargin = Math.floor(source.width * 0.1);

    expect(source.width).toBe(1024);
    expect(source.height).toBe(1024);
    expect(bounds.minX).toBeGreaterThanOrEqual(minimumMargin);
    expect(bounds.minY).toBeGreaterThanOrEqual(minimumMargin);
    expect(bounds.maxX).toBeLessThan(source.width - minimumMargin);
    expect(bounds.maxY).toBeLessThan(source.height - minimumMargin);
  });

  it.each(densityCases)(
    'commits a reproducible padded %s splash image',
    (density, size, expectedPixelHash) => {
      const splashPath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        `drawable-${density}`,
        'splashscreen_logo.png',
      );
      const encodedPng = fs.readFileSync(splashPath);
      const png = PNG.sync.read(encodedPng);
      const bounds = alphaBounds(png);
      const minimumMargin = Math.floor(size * 0.1);
      const pixelHash = crypto
        .createHash('sha256')
        .update(png.data)
        .digest('hex');

      expect(encodedPng.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.width).toBe(size);
      expect(png.height).toBe(size);
      expect(bounds.minX).toBeGreaterThanOrEqual(minimumMargin);
      expect(bounds.minY).toBeGreaterThanOrEqual(minimumMargin);
      expect(bounds.maxX).toBeLessThan(size - minimumMargin);
      expect(bounds.maxY).toBeLessThan(size - minimumMargin);
      expect(pixelHash).toBe(expectedPixelHash);
    },
  );
});
