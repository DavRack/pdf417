<script lang="ts">
	//import * as rxing from "rxing-wasm";

  export let decodesPerSecond = 1

  let cameraPreviewCanvas: HTMLCanvasElement
  let video: HTMLVideoElement

  const BARCODE_ASPECTRATIO = 5
  const BARCODE_OVERLAY_WIDTH = 90
  let height = 3840;     // This will be computed based on the input stream
  let width = 2160;    // We will scale the photo width to this. UHD horizontal resolution
  let codeFound = false
  let error: string


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
    //facingMode: "environment",
    //frameRate?: ConstrainDouble;
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
        //zoom: 2
      }
    ]
  }
  let timer = setInterval(handleDecode, 1000/decodesPerSecond)

  let errorPerm = ""
  async function startUp(videoConfig: MediaTrackConstraints, camera: MediaDeviceInfo){
    if(!camera.deviceId){
      let cameras = (await navigator.mediaDevices.enumerateDevices())
      .filter(device => device.kind === "videoinput")
      camera = cameras.find(camera => camera.label.includes("back") || camera.label.includes("trasera"))
      userSelectedCamera = camera
    }

    navigator.mediaDevices
      .getUserMedia({ audio: false, video: {
        ...videoConfig,
        deviceId: camera?.deviceId,
      }})
      .then((stream) => {
        video.srcObject = stream;
        video.play();
      })
  }
  function takepicture(): ImageData {
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
    setCameraOptions()
    let rxing = await import("rxing-wasm")
    let hints = new rxing.DecodeHintDictionary()
    hints.set_hint(rxing.DecodeHintTypes.PossibleFormats, `Pdf417`)
    try {
      let imageData = takepicture()
      const luma_data = rxing.convert_js_image_to_luma(new Uint8Array(imageData.data));
      let result = rxing.decode_barcode_with_hints(luma_data, video.videoWidth, video.videoHeight, hints)
      let text = result.text()
      error = text
      clearInterval(timer)
      idData = extractData(text)
      codeFound = true
    }catch (e) {
      error = "no se ha encontrado un código, sigue intentando"
      codeFound = false
    }
  }
  let rawIdString = ""
  function extractData(rawString: string){
    rawIdString = rawString
    // convert to hex bytes
    //let hexText = byteArray.map(byte => byte.toString(16).padStart(2,'0')).join('')
    //error = hexText
    for (let i = 0;i<idData.length; i++){
      let idField = idData[i]
      let data = rawString.slice(...idField.position);
      let dataRemoveNulls = data.split("").filter(char => char.codePointAt(0) !== 65533).join("")
      let dataRemoveLeadingZeros = dataRemoveNulls.replace(/^0+/, '')
      idField.value = dataRemoveLeadingZeros
    }
    return idData
  }
  extractData("")
  let userSelectedCamera: MediaDeviceInfo = {deviceId: "", groupId: "", kind: "videoinput", label: "", toJSON: () => {}}
  $: startUp(videoConfig, userSelectedCamera)
  let cameraOptions: MediaDeviceInfo[] = []
  async function setCameraOptions(){
      let cameras = (await navigator.mediaDevices.enumerateDevices())
      .filter(device => device.kind === "videoinput")
    cameraOptions = cameras
  }
  $: console.log(userSelectedCamera)

</script>
{#if !codeFound}
  <div style="background-color: white;">
    <div>Cambiar cámara</div>
    <select bind:value={userSelectedCamera} placeholder="Cambiar cámara">
      {#each cameraOptions as cameraOption (cameraOption.deviceId)}
        <option value={cameraOption}>
          {cameraOption.label}
        </option>
      {/each}
    </select>
  </div>
  <div style="display: flex; flex-direction: row; justify-content: center; max-width: 100svw; height: 90svh;">
    <div style="max-width: 100svw; max-height: 80svh; position: relative;">
      <video
        playsinline
        bind:this={video}
        on:canplay={() => {}}
        style="object-fit: initial; width: inherit; height: inherit; max-height: inherit;position: relative;"
      >
        Video stream not available.
      </video>
      <div style="position: absolute; top: 0px; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center;">
        <div style="margin: auto; border-width: 0.2em; border-radius: 1em; border-color: white; border-style: solid; width: {BARCODE_OVERLAY_WIDTH}%; aspect-ratio: {BARCODE_ASPECTRATIO};">
        </div>
      </div>
    </div>
  </div>
{:else}
  {#each idData as idField (idField.field)}
    <div>
      <b>{idField.label}:</b>  <span>{idField.value}</span>
    </div>
  {/each}
{/if}
{rawIdString}
<canvas bind:this={cameraPreviewCanvas} style="display: none;"></canvas>
