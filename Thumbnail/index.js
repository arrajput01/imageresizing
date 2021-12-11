const stream = require('stream');
const Jimp = require('jimp');

const {
  Aborter,
  BlobURL,
  BlockBlobURL,
  ContainerURL,
  ServiceURL,
  SharedKeyCredential,
  StorageURL,
  uploadStreamToBlockBlob
} = require("@azure/storage-blob");

const ONE_MEGABYTE = 1024 * 1024;
const ONE_MINUTE = 60 * 1000;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };

const containerName = "bringfresh";
const accountName = "bringstorage";
const accessKey = "BlA56OiKGLEXk/baM2h4TZ/ucj7IN/bcCBscNGLvc4wV8cm7Mba77K391876LyCnCcuxZQ5WeAufmqzn+bpP2w==";

const sharedKeyCredential = new SharedKeyCredential(
  accountName,
  accessKey);
const pipeline = StorageURL.newPipeline(sharedKeyCredential);
const serviceURL = new ServiceURL(
  `https://${accountName}.blob.core.windows.net`,
  pipeline
);

module.exports.image_resize =async (context, eventGridEvent, inputBlob) => {

  const aborter = Aborter.timeout(30 * ONE_MINUTE);
  const widthInPixels = 100;
  const contentType = context.bindingData.data.contentType;
  const blobUrl = context.bindingData.data.url;
  const blobName = blobUrl.slice(blobUrl.lastIndexOf("/")+1);

  const image = await Jimp.read(inputBlob);
  const thumbnail = image.resize(widthInPixels, Jimp.AUTO);
  const thumbnailBuffer = await thumbnail.getBufferAsync(Jimp.AUTO);
  const readStream = stream.PassThrough();
  readStream.end(thumbnailBuffer);

  const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
  const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, blobName);
  try {

    await uploadStreamToBlockBlob(aborter, readStream,
      blockBlobURL, uploadOptions.bufferSize, uploadOptions.maxBuffers,
      { blobHTTPHeaders: { blobContentType: "image/*" } });

  } catch (err) {

    context.log(err.message);

  } finally {

    context.done();

  }
};
