<script lang="ts">
  import {decode_barcode, convert_js_image_to_luma,  DecodeHintDictionary } from "rxing-wasm"
  import {getBarcodeImage} from "./imageManipulation"
  import {Html5Qrcode, Html5QrcodeScanner, Html5QrcodeSupportedFormats} from "html5-qrcode"
  import {onMount} from "svelte"


  let canvas: HTMLCanvasElement
  let rawText: string
  let rawError: string
  let errorCount = 0
  let user_files: FileList
  $: if(user_files){
      handleFile(user_files[0])
  }

  let idData = [
    {label: "Primer Nómbre", value: "", field:"firstName", position: [104, 127]},
    {label: "Segundo nombre", value: "", field:"middleName", position: [127, 150]},
    {label: "Primer Apellido", value: "", field:"lastName", position: [58, 80]},
    {label: "Segundo Apellido", value: "", field:"secondLastName", position: [81, 104]},
    {label: "Número documento", value: "", field:"documentNumber", position: [48,58]},
    {label: "Genero", value: "", field:"gender", position: [152, 153]},
    {label: "Día nacimiento", value: "", field:"birthdayDay", position: [159, 161]},
    {label: "Mes nacimiento", value: "", field:"birthdayMonth", position: [157, 159]},
    {label: "Año nacimiento", value: "", field:"birthdayYear", position: [153, 157]},
    {label: "Tipo de sangre", value: "", field:"bloodType", position: [167, 169]},
    {label: "Código de departamento", value: "", field:"departmentCode", position: [161, 163]},
    {label: "Código municipio", value: "", field:"municipalityCode", position: [163, 166]},
    {label: "Código afis", value: "", field:"afisCode", position: [2, 10]},
    {label: "Finger Card", value: "", field:"fingerCard", position: [40, 48]},
  ]

  function handleFile(file: File) {
    const img = new Image;
    img.src = URL.createObjectURL(file);
    const ctx = canvas.getContext('2d');
    if (!ctx){
      return
    }
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
    }
  }

  async function handleDecode(canvas: HTMLCanvasElement){
    const context = canvas.getContext('2d');
    if (!context){
      return
    }
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const luma_data = convert_js_image_to_luma(new Uint8Array(imageData.data));
    let hints = new DecodeHintDictionary()
    try{
      let result = decode_barcode(luma_data, canvas.width, canvas.height, true)
      let text = result.text()
      rawText = text
      console.log(stringToHex(text))
      extractData(text)
    }catch (e){
      alert(e)
    }
  }
  const stringToHex = (str) => {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const hexValue = charCode.toString(16);

    // Pad with zeros to ensure two-digit representation
    hex += hexValue.padStart(2, '0');
  }
  return hex;
};

  function extractData(text: string){
    let utf8Encode = new TextEncoder();
    let bytes = utf8Encode.encode(text);

    for (let i = 0;i<idData.length; i++){
      let idField = idData[i]
      let data = bytes.slice(...idField.position);
      let decoder = new TextDecoder("UTF-8")
      idField.value = decoder.decode(data)
    }

    rawText = text
    idData = idData
  }
  async function handleTransform(canvas: HTMLCanvasElement){
    let transformImage = await getBarcodeImage(canvas)
    let imgData = new ImageData(new Uint8ClampedArray(transformImage.data), transformImage.cols, transformImage.rows)
    let ctx = canvas.getContext("2d")
    if (!ctx){
      return
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = imgData.width
    canvas.height = imgData.height
    ctx.putImageData(imgData, 0, 0)
  }
  function onScanSuccess(decodedText, decodedResult) {
  // handle the scanned code as you like, for example:
  console.log(`Code matched = ${decodedText}`, decodedResult);
    rawText = decodedText
}

  function onScanFailure(error) {
    // handle scan failure, usually better to ignore and keep scanning.
    // for example:
    //console.warn(`Code scan error = ${error}`);
    rawError = error
    errorCount += 1

  }

  onMount(async () => {
    let devices = await navigator.mediaDevices.enumerateDevices()
    let videoDevices = Object.values(devices).filter(d => d.kind === "videoinput")
    let devId = videoDevices[1].deviceId
    console.log(videoDevices)
    let html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        //formatsToSupport: [
        //  Html5QrcodeSupportedFormats.PDF_417
        //],
        //showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
        videoConstraints: {
          advanced: [
            {
              
              //aspectRatio?: ConstrainDouble,
              autoGainControl: true,
              //channelCount?: ConstrainULong,
              deviceId: devId,
              //displaySurface?: ConstrainDOMString,
              //echoCancellation?: ConstrainBoolean,
              //facingMode?: ConstrainDOMString,
              frameRate: 30,
              //groupId?: ConstrainDOMString,
              height: 400,
              noiseSuppression: false,
              //sampleRate?: ConstrainULong,
              //sampleSize?: ConstrainULong,
              width: 1920,
            }
          ],
        },
        //aspectRatio: 5.5,

      },
      /* verbose= */ false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  })
  async function handleDecode2(_){
    let file = user_files[0]
    let scanner = new Html5Qrcode("reader")
    let result = await scanner.scanFile(file, false)
    const utf8EncodeText = new TextEncoder()
    let byteArray = Array.from(utf8EncodeText.encode(result))
    let hexText = byteArray.map(byte => byte.toString(16).padStart(2,'0')).join('')
    rawText = result
    rawText = hexText
    //alert(result)
  }
</script>
<h1>Test pdf417</h1>
<p>{rawText}</p>
<p>errorCount: {errorCount}
  error: {rawError}</p>
<input accept="image/png, image/jpeg" type="file" bind:files={user_files}>
<h2>
  Barcode data
  <button on:click={() => {handleDecode2(canvas)}}>decode</button>
  <button on:click={() => {handleTransform(canvas)}}>transform</button>
</h2>
<div width="600px" style="height: 500px; display: inline-block; padding: 0px; border: 1px solid silver;">
  <div id="reader" style="height: 500px; display: inline-block; padding: 0px; border: 1px solid silver;"></div>
</div>
{#each idData as idField (idField.field)}
  <div>
    <b>{idField.label}:</b>  <span>{idField.value}</span>
  </div>
{/each}
<canvas bind:this={canvas} ></canvas>
