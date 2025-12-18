export interface ImageMetrics {
  brightness: number; // 0.0 ~ 1.0
  saturation: number; // 0.0 ~ 1.0
}

export const calculateImageMetrics = (base64: string): Promise<ImageMetrics> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // using canvas to extract pixel data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }


      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      
      let totalBrightness = 0;
      let totalSaturation = 0;
      let pixelCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r === 0 && g === 0 && b === 0) {
            continue; 
        }
        // Normalized RGB
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;

        // RGB -> HSV
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        const delta = max - min;

        // Brightness (Value)
        const brightness = max;

        // Saturation
        let saturation = 0;
        if (max !== 0) {
          saturation = delta / max;
        }

        totalBrightness += brightness;
        totalSaturation += saturation;
        pixelCount++;
      }

        if (pixelCount === 0) {
            resolve({ brightness: 0.0, saturation: 0.0 });
            } 
        else {
            resolve({
                brightness: totalBrightness / pixelCount,
                saturation: totalSaturation / pixelCount
            });
        }

        console.log('pixelCount:', pixelCount);
    };

    img.onerror = (err) => reject(err);
    img.src = base64;
  });
};