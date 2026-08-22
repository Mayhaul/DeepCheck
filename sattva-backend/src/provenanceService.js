const {unavailable}=require('./utils')
function inspectProvenance(submission){if(!submission.fileUrl&&!submission.sourceUrl)return unavailable('PROVENANCE_UNAVAILABLE');return {available:true,metadata:{mimeType:submission.fileMeta?.mimeType||null,bytes:submission.fileMeta?.bytes||null},creationTime:submission.createdAt||null,modificationTime:null,sourceUrl:submission.sourceUrl||submission.fileUrl,c2paStatus:'unknown'}}
module.exports={inspectProvenance}
