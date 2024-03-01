var filesInput = document.getElementById("filesInput");
var statusThing = document.getElementById("status");
var preview = document.getElementById("preview");
var context = preview.getContext("2d");
var download = document.getElementById("download");

function debug(text) {
  statusThing.innerText = "Log: " + text;
}

function getEntries(file, options) {
  var zipReader = new zip.ZipReader(new zip.BlobReader(file));
  console.log(zipReader);
  return zipReader.getEntries(options);
}

function getImage(src) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getCanvasBlob() {
  return new Promise(function (resolve) {
    // Make canvas object from image
    preview.toBlob(resolve, "image/png");
  });
}

filesInput.onchange = async function (e) {
  console.log(e.target.files[0]);
  var file = e.target.files[0];
  if (file.type != "application/x-zip-compressed") {
    debug("Needs to be a zip file.");
    return;
  }
  var entries = await getEntries(file);
  console.log(entries);

  var zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"), {
    bufferedWrite: true,
    useCompressionStream: false,
  });

  debug("Parsing files...");

  for (var i in entries) {
    var entry = await entries[i].getData(new zip.BlobWriter());
    console.log(entry);

    var img = await getImage(URL.createObjectURL(entry));

    preview.width = img.width;
    preview.height = img.height;
    console.log(img.width, img.height);
    context.drawImage(img, 0, 0, img.width, img.height);
    context.clearRect(0, 0, 1, img.height); // left
    context.clearRect(0, 0, img.width, 1); // top
    context.clearRect(img.width - 1, 0, 1, img.height); // right
    context.clearRect(0, img.height - 1, img.width, 1); // bottom

    var blob = await getCanvasBlob();
    zipWriter.add(i.toString() + ".png", new zip.BlobReader(blob), {});
  }

  debug("Finished parsing files");

  download.style.display = "block";
  download.onclick = async function () {
    if (zipWriter) {
      const blobURL = URL.createObjectURL(await zipWriter.close());
      zipWriter = null;
      const anchor = document.createElement("a");
      const clickEvent = new MouseEvent("click");
      anchor.href = blobURL;
      anchor.download = "fixed_" + filesInput.files[0].name;
      anchor.dispatchEvent(clickEvent);
    } else {
      throw new Error("Zip file closed");
    }
  };
};
