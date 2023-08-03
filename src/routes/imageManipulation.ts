export async function getBarcodeImage(imgSrc: HTMLCanvasElement){
  let cv = await (await import("@techstark/opencv-js")).default

  let img = cv.imread(imgSrc)
  let imgGray = img.clone()
  cv.cvtColor(img, imgGray, cv.COLOR_RGBA2GRAY)

  let imagePixels = Array.from(imgGray.data)
  let avgPixelValue = Math.round(imagePixels.reduce((b, c) => { return b + c}, 0)/imagePixels.length)
  let threshold = avgPixelValue+((255-avgPixelValue)/2)
  console.log(avgPixelValue)

  // alter the image to make more evident the barcode
  let ddepth = cv.CV_32F
  let gradX = imgGray.clone()
  cv.Sobel(imgGray, gradX, ddepth, 1, 0, -1)
  let gradY = imgGray.clone()
  cv.Sobel(imgGray, gradY, ddepth, 0, 1, -1)
  let wImg = imgGray.clone()
  cv.subtract(gradX, gradY, wImg)
  cv.convertScaleAbs(wImg, wImg)
  cv.blur(wImg, wImg, {width: 10, height: 10})
  cv.threshold(wImg, wImg, threshold, 255, cv.THRESH_BINARY)
  let kernel = cv.getStructuringElement(cv.MORPH_RECT, {width: wImg.cols*0.02, height:wImg.cols*0.02,})
  cv.morphologyEx(wImg, wImg, cv.MORPH_CLOSE, kernel)
  cv.erode(wImg, wImg, kernel)
  cv.dilate(wImg, wImg, kernel)


  // find the largest rectangle
  let v = new cv.MatVector()
  let cnts = wImg.clone()
  cv.findContours(wImg, v, cnts,  cv.RETR_EXTERNAL ,cv.CHAIN_APPROX_SIMPLE)

  let rectanglesInImg = v.size()
  if(Number(rectanglesInImg) == 0){
    return img
  }
  let biggestRect = cv.boundingRect(v.get(0))

  // find the largest
  for (let i = 1; i<Number(rectanglesInImg); i++){
    let newRect = cv.boundingRect(v.get(i))
    if (rectangleArea(newRect) > rectangleArea(biggestRect)){
      biggestRect = newRect
    }
  }

  let br = biggestRect

  // draw rectangle
  cv.rectangle(wImg, {width:0, height:0, x: br.x, y:br.y},{width:0, height:0, x: br.width+br.x, y:br.height+br.y}, [200, 0, 200, 200], 5)

  cv.cvtColor(wImg, img, cv.COLOR_GRAY2RGBA)
  return img
}

function rectangleArea(rect: {width: number, height: number, x: number, y: number}){
  return (rect.width)*(rect.height)
}
