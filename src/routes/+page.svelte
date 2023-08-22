<script lang="ts">
//import { getBarcodeImage } from "./imageManipulation";



export let decodesPerSecond = 3

let cameraPreviewCanvas: HTMLCanvasElement
let video: HTMLVideoElement

const BARCODE_ASPECTRATIO = 5
const BARCODE_OVERLAY_WIDTH = 90
let height = 3840;     // This will be computed based on the input stream
let width = 2160;    // We will scale the photo width to this. UHD horizontal resolution

let appState: "notStarted"|"videoInitialized"|"codeFound" = "notStarted"
let error: string
let cameraError: null|string

let userSelectedCamera: MediaDeviceInfo = {deviceId: "", groupId: "", kind: "videoinput", label: "", toJSON: () => {}}
let cameraOptions: MediaDeviceInfo[] = []


let idData = [
  {label: "Primer Nómbre", value: "", field:"firstName", position: [104, 127]},
  {label: "Segundo nombre", value: "", field:"middleName", position: [127, 150]},
  {label: "Primer Apellido", value: "", field:"lastName", position: [58, 81]},
  {label: "Segundo Apellido", value: "", field:"secondLastName", position: [81, 104]},
  {label: "Número documento", value: "", field:"documentNumber", position: [48,58]},
  {label: "Genero", value: "", field:"gender", position: [151, 152]},
  {label: "Día nacimiento", value: "", field:"birthdayDay", position: [158, 160]},
  {label: "Mes nacimiento", value: "", field:"birthdayMonth", position: [156, 158]},
  {label: "Año nacimiento", value: "", field:"birthdayYear", position: [152, 156]},
  {label: "Tipo de sangre", value: "", field:"bloodType", position: [166, 168]},
  {label: "Código de departamento", value: "", field:"departmentCode", position: [160, 162]},
  {label: "Código municipio", value: "", field:"municipalityCode", position: [162, 165]},
  {label: "Código afis", value: "", field:"afisCode", position: [0, 24]},
  {label: "Finger Card", value: "", field:"fingerCard", position: [40, 48]},
]

const userVideoConfig = {
  //aspectRatio: ID_BARCODE_ASPECTRATIO,
  autoGainControl: false,
  //channelCount?: ConstrainULong;
  //deviceId?: ConstrainDOMString;
  //displaySurface?: ConstrainDOMString;
  //echoCancellation?: ConstrainBoolean;
  facingMode: "environment",
  frameRate: 30,
  //groupId?: ConstrainDOMString;
  noiseSuppression: false,
  //sampleRate?: ConstrainULong;
  //sampleSize?: ConstrainULong;
  width: height,
  height: width,
}

const videoConfig:MediaTrackConstraints = {
  advanced: [
    {
      ...userVideoConfig,
      zoom: 1
    }
  ]
}


async function startUp(videoConfig: MediaTrackConstraints, camera?: MediaDeviceInfo){
  // we use this to ask for camera permission
  let permissionsVideo: MediaStream
  try{
    permissionsVideo = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
  }catch{
    console.info("cant get camera permission")
    return
  }
  console.log("p1")

  await setCameraOptions()

  console.log("p3")
  if(!camera?.deviceId){
    let cameras = (await navigator.mediaDevices.enumerateDevices())
    .filter(device => device.kind === "videoinput")

    rawIdString = JSON.stringify(cameras)
    if (cameras.length === 0){
      cameraError = "No hay cámaras disponibles"
      return
    }
    camera = cameras.find(camera => camera.label.includes("back") || camera.label.includes("trasera")) || cameras[0]
    userSelectedCamera = camera
  }

  try{
  video.srcObject = await navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        ...videoConfig,
        deviceId: camera?.deviceId,
      }
    })
  console.log("p4")
  }catch(e){
    console.error(e)
  console.log("p5")
    return
  }

  try{
    await video.play()
    console.log("video play good")
    appState = "videoInitialized"
  }catch{
    console.log("video play bad")
  }
}

function takepicture(video: HTMLVideoElement): ImageData {
  // take a picture of the rectangle of interest for the bar code

  // get the size and offset for the interest rectangle
  let barcodeWidthPercent = (BARCODE_OVERLAY_WIDTH/100)
  let barcodeWidth = video.videoWidth*barcodeWidthPercent
  let barcodeHeight = barcodeWidth/(BARCODE_ASPECTRATIO)
  let barcodeYOffset = (video.videoHeight/2)-(barcodeHeight/2)
  let barcodeXOffset = ((1-barcodeWidthPercent)/2)*video.videoWidth

  // apply the barcode size to canvas
  cameraPreviewCanvas.width = barcodeWidth
  cameraPreviewCanvas.height = barcodeHeight

  let ctx = cameraPreviewCanvas.getContext("2d")
  if (!ctx){
    throw Error("Cant get canvas context")
  }
  ctx.fillStyle = "#AAA"
  ctx.fillRect(0,0, barcodeWidth, barcodeHeight)

  // capture image from video with the calculated offset and size and draw the image into the canvas
  ctx.drawImage(video, barcodeXOffset, barcodeYOffset, barcodeWidth, barcodeHeight, 0, 0, barcodeWidth, barcodeHeight)
  const data = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight)
  return data
}

async function handleDecode(){
  let t1 = Date.now()
  let rxing = await import("rxing-wasm")
  let hints = new rxing.DecodeHintDictionary()
  hints.set_hint(rxing.DecodeHintTypes.PossibleFormats, `Pdf417`)
  hints.set_hint(rxing.DecodeHintTypes.TryHarder, `true`)
  if (!video){
    return
  }
  let imageData = takepicture(video)
  //let imageData = await getBarcodeImage(cameraPreviewCanvas)
  const luma_data = rxing.convert_js_image_to_luma(new Uint8Array(imageData.data));
  try {
    let t2 = Date.now()
    let result = rxing.decode_barcode_with_hints(luma_data, video.videoWidth, video.videoHeight, hints)
    let text = result.text()
    let t3 = Date.now()

    console.log("exec time: ",t3-t2)
    error = text
    idData = extractData(text)
    codeFound()
  }catch (e) {
    error = "no se ha encontrado un código, sigue intentando"
  }
  let t4 = Date.now()
}

let rawIdString = ""
function extractData(rawString: string){
  rawIdString = stringToBytes(rawString)
  for (let i = 0;i<idData.length; i++){
    let idField = idData[i]
    let data = rawString.slice(...idField.position);
    let dataRemoveNulls = data.split("").filter(char => char.codePointAt(0) !== 65533).join("")
    let dataRemoveLeadingZeros = dataRemoveNulls.replace(/^0+/, '')
    idField.value = dataRemoveLeadingZeros
  }
  return idData
}
async function setCameraOptions(){
  let cameras = (await navigator.mediaDevices.enumerateDevices())
  .filter(device => device.kind === "videoinput")
  cameraOptions = cameras
}
function stringToBytes(string: string){
  let utf8Encode = new TextEncoder();
  let bytes = Array.from(utf8Encode.encode(string))
  return bytes.map(byte => byte.toString(16).padStart(2,'0')).join("")
}

function codeFound(){
  clearInterval(timer)
  appState = "codeFound"
  video.pause()
}

let timer: ReturnType<typeof setTimeout>
$: if (appState === "videoInitialized"){
  timer = setInterval(handleDecode, 1000/decodesPerSecond)
}
startUp(videoConfig)
</script>
{#if appState === "notStarted"}
  <p>accediendo a la cámara<p/>
{/if}
{#if appState === "videoInitialized"}
  <div style="background-color: white;">
    <div>Cambiar cámara</div>
    <select bind:value={userSelectedCamera} on:change={() => startUp(videoConfig,userSelectedCamera)}>
      {#each cameraOptions as cameraOption (cameraOption.deviceId)}
        <option value={cameraOption}>
          {cameraOption.label}
        </option>
      {/each}
    </select>
  </div>
{/if}
{#if appState !== "codeFound"}
  <div style="display: flex; flex-direction: row; justify-content: center; max-width: 100svw; height: 90svh;">
    {#if cameraError}
      <p>{cameraError}</p>
    {:else}
      <div style="max-width: 100svw; height: 80svh; position: relative;">
        <video
          playsinline
          bind:this={video}
          on:canplay={() => {}}
          style="object-fit: initial; width: 100%; height: 100%; position: relative;"
        >
          Video stream not available.
        </video>
        <div style="position: absolute; top: 0px; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center;">
          <div style="margin: auto; border-width: 0.2em; border-radius: 1em; border-color: white; border-style: solid; width: {BARCODE_OVERLAY_WIDTH}%; aspect-ratio: {BARCODE_ASPECTRATIO};">
          </div>
        </div>
      </div>
    {/if}
  </div>
{:else if appState === "codeFound"}
  {#each idData as idField (idField.field)}
    <div>
      <b>{idField.label}:</b>  <span>{idField.value}</span>
    </div>
  {/each}
  <p>Hex data:</p>
  <div style="width: 100svw;">{rawIdString}</div>
{/if}
<canvas bind:this={cameraPreviewCanvas} style="display: none;"></canvas>
