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
  let aproxCurve = wImg.clone()
  let count = v.get(0)
  let perimeter = cv.arcLength(count, false)
  cv.approxPolyDP(count, aproxCurve, 0.02 * perimeter, true)
  v.set(0, aproxCurve)
  cv.drawContours(img, v, 0, [200, 0, 200, 200])

  let corner1 = new cv.Point(aproxCurve.data32S[0], aproxCurve.data32S[1]);
  let corner2 = new cv.Point(aproxCurve.data32S[2], aproxCurve.data32S[3]);
  let corner3 = new cv.Point(aproxCurve.data32S[4], aproxCurve.data32S[5]);
  let corner4 = new cv.Point(aproxCurve.data32S[6], aproxCurve.data32S[7]);
  //Order the corners
  let cornerArray = [{ corner: corner1 }, { corner: corner2 }, { corner: corner3 }, { corner: corner4 }];
  //Sort by Y position (to get top-down)
  cornerArray.sort((item1, item2) => { return (item1.corner.y < item2.corner.y) ? -1 : (item1.corner.y > item2.corner.y) ? 1 : 0; }).slice(0, 5);

  //Determine left/right based on x position of top and bottom 2
  let tl = cornerArray[0].corner.x < cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
  let tr = cornerArray[0].corner.x > cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
  let bl = cornerArray[2].corner.x < cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];
  let br = cornerArray[2].corner.x > cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];

  //Calculate the max width/height
  let widthBottom = Math.hypot(br.corner.x - bl.corner.x, br.corner.y - bl.corner.y);
  let widthTop = Math.hypot(tr.corner.x - tl.corner.x, tr.corner.y - tl.corner.y);
  let theWidth = (widthBottom > widthTop) ? widthBottom : widthTop;
  let heightRight = Math.hypot(tr.corner.x - br.corner.x, tr.corner.y - br.corner.y);
  let heightLeft = Math.hypot(tl.corner.x - bl.corner.x, tr.corner.y - bl.corner.y);
  let theHeight = (heightRight > heightLeft) ? heightRight : heightLeft;

  let finalDestCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, theWidth - 1, 0, theWidth - 1, theHeight - 1, 0, theHeight - 1]); //
  let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.corner.x, tl.corner.y, tr.corner.x, tr.corner.y, br.corner.x, br.corner.y, bl.corner.x, bl.corner.y]);
  let dsize = new cv.Size(theWidth, theHeight);
  let M = cv.getPerspectiveTransform(srcCoords, finalDestCoords)
  cv.warpPerspective(img, img, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
  // find the largest
  // for (let i = 1; i<Number(rectanglesInImg); i++){
  //   let newRect = cv.boundingRect(v.get(i))
  //   if (rectangleArea(newRect) > rectangleArea(biggestRect)){
  //     biggestRect = newRect
  //   }
  // }

  let bR = biggestRect
  // make rectangle bigger to get some lee way
  let scaleFactor = wImg.cols*0.017
  scaleFactor = 0
  bR = {
    x: bR.x - scaleFactor,
    y: bR.y - scaleFactor,
    width: bR.width + 2*scaleFactor,
    height: bR.height + 2*scaleFactor
  }
  img = img.rowRange(bR.y, bR.y+bR.height)
  cv.rotate(img, img, cv.ROTATE_90_CLOCKWISE)
  img = img.rowRange(bR.x, bR.x+bR.width)
  cv.rotate(img, img, cv.ROTATE_90_COUNTERCLOCKWISE)

  // // draw rectangle
  // cv.rectangle(wImg, {width:0, height:0, x: br.x, y:br.y},{width:0, height:0, x: br.width+br.x, y:br.height+br.y}, [200, 0, 200, 200], 5)

  // cv.cvtColor(v, img, cv.COLOR_GRAY2RGBA)
  return img
}

function rectangleArea(rect: {width: number, height: number, x: number, y: number}){
  return (rect.width)*(rect.height)
}
