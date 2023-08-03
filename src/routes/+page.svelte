<script lang="ts">
  import {decode_barcode_with_hints, convert_js_image_to_luma,  DecodeHintDictionary } from "rxing-wasm"
  import {getBarcodeImage} from "./imageManipulation"


  let canvas: HTMLCanvasElement
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
      let result = decode_barcode_with_hints(luma_data, canvas.width, canvas.height, hints)
      let text = result.text()
      extractData(text)
    }catch (e){
      alert("no se losgŕo decodificar el código de barras")
    }
  }

  function extractData(text: string){
    let utf8Encode = new TextEncoder();
    let bytes = utf8Encode.encode(text);

    for (let i = 0;i<idData.length; i++){
      let idField = idData[i]
      let data = bytes.slice(...idField.position);
      let decoder = new TextDecoder("UTF-8")
      idField.value = decoder.decode(data)
    }

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
</script>
<h1>Test pdf417</h1>
<input accept="image/png, image/jpeg" type="file" bind:files={user_files}>
<h2>
  Barcode data
  <button on:click={() => {handleDecode(canvas)}}>decode</button>
  <button on:click={() => {handleTransform(canvas)}}>transform</button>
</h2>
{#each idData as idField (idField.field)}
  <div>
    <b>{idField.label}:</b>  <span>{idField.value}</span>
  </div>
{/each}
<canvas bind:this={canvas} ></canvas>
