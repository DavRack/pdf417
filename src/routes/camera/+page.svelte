<script lang="ts">
	import { DecodedTextType } from "html5-qrcode/esm/core";
	import { BarcodeFormat, DecodeHintDictionary, DecodeHintTypes, convert_js_image_to_luma, decode_barcode, decode_barcode_with_hints } from "rxing-wasm";

  export let decodesPerSecond = 2

  let cameraPreviewCanvas: HTMLCanvasElement
  let video: HTMLVideoElement

  const ID_BARCODE_ASPECTRATIO = 5
  let width = 3840;    // We will scale the photo width to this. UHD horizontal resolution
  let height = Math.round(width/ID_BARCODE_ASPECTRATIO);     // This will be computed based on the input stream
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
    //aspectRatio?: ConstrainDouble;
    autoGainControl: false,
    //channelCount?: ConstrainULong;
    //deviceId?: ConstrainDOMString;
    //displaySurface?: ConstrainDOMString;
    //echoCancellation?: ConstrainBoolean;
    //facingMode?: ConstrainDOMString;
    //frameRate?: ConstrainDouble;
    //groupId?: ConstrainDOMString;
    noiseSuppression: false,
    //sampleRate?: ConstrainULong;
    //sampleSize?: ConstrainULong;
    width,
    height
  }

  const videoConfig:MediaTrackConstraints = {
    advanced: [
      {
        ...userVideoConfig,
        zoom: 2
      }
    ]
  }
  let timer = setInterval(handleDecode, 1000/decodesPerSecond)

  async function startUp(videoConfig: MediaTrackConstraints){
    let backCamera = (await navigator.mediaDevices.enumerateDevices())
    .filter(device => device.kind === "videoinput")
    .find(camera => camera.label.includes("back"))

    navigator.mediaDevices
      .getUserMedia({ audio: false, video: {
        ...videoConfig,
        deviceId: backCamera?.deviceId,
      }})
      .then((stream) => {
        video.srcObject = stream;
        video.play();
      })
  }
  function takepicture(): ImageData {
    console.log(video.videoWidth, video.videoHeight)
    cameraPreviewCanvas.height = video.videoHeight
    cameraPreviewCanvas.width = video.videoWidth
    let ctx = cameraPreviewCanvas.getContext("2d")
    if (!ctx){
      throw Error("Cant get canvas context")
    }
    ctx.fillStyle = "#AAA"
    ctx.fillRect(0,0, cameraPreviewCanvas.width, cameraPreviewCanvas.height)
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
    const data = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight)
    return data
  }

  async function handleDecode(){
    let hints = new DecodeHintDictionary()
    hints.set_hint(DecodeHintTypes.PossibleFormats, `Pdf417`)
    try {
      let imageData = takepicture()
      const luma_data = convert_js_image_to_luma(new Uint8Array(imageData.data));
      let result = decode_barcode_with_hints(luma_data, video.videoWidth, video.videoHeight, hints)
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
  let error2 = ""
  function extractData(rawString: string){
    error2 = rawString
    // convert to hex bytes
    //let hexText = byteArray.map(byte => byte.toString(16).padStart(2,'0')).join('')
    //error = hexText
    for (let i = 0;i<idData.length; i++){
      let idField = idData[i]
      let data = rawString.slice(...idField.position);
      idField.value = data.split("").filter(char => char.codePointAt(0) !== 65533).join("")
    }
    return idData
  }
  extractData("")
  startUp(videoConfig)
</script>
{#if !codeFound}
  <div class="camera" style="height: 90svh;">
    <video bind:this={video} on:canplay={() => {}} style="object-fit: initial; height: 100%;">
      Video stream not available.
    </video>
  </div>
{:else}
  {#each idData as idField (idField.field)}
    <div>
      <b>{idField.label}:</b>  <span>{idField.value}</span>
    </div>
  {/each}
{/if}
<canvas bind:this={cameraPreviewCanvas} style="display: none;"></canvas>
