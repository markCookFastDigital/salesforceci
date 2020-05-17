var  execSync = require('child_process').execSync;
var alwaysAdd = '<?xml version="1.0" encoding="UTF-8"?>'
var fs = require('fs');
var parser = require('xml2json');
var _ = require('lodash');
var beut = require('vkbeautify')
var toposort = require('toposort')
const xmlKey = '$t'
const splitter = /[\r\n]+/
//TODO OBJECT _ historyRetentionPolicy
const mandatory = ['xmlns','allowInChatterGroups' ,'deploymentStatus' ,'description' ,'enableActivities' ,'enableBulkApi' ,'enableFeeds' 
                  ,'enableHistory' ,'enableReports' ,'enableSearch' ,'enableSharing' ,'externalSharingModel' ,'fullName' ,'label' 
                  ,'nameField' ,'pluralLabel'  ,'recordTypeTrackFeedHistory' ,'recordTypeTrackHistory' ,'sharingModel' ,'visibility', 'sharingModel']


var objects = []
var apps = []
var finishedApps = []
var finishedObjects = {}
var layouts = []
var finishedLayouts = {}
var flexiPages = []
var finishedFlexiPages ={}
var newKeysInDest = []
var newKeysInSource = []

var changedFiles = [];

const args = process.argv.slice(2)
var helpFlags = ['-h','-H','-help','help','--help','Help','-Help', '--Help']
if (args.length == 1 && helpFlags.includes(args[0])) {
  console.log('node app.js featureBranch startBranch destBranch doDelete(true/False)')
  return
}

if (args.length < 3) {
  console.error('Missing command line args');
  console.log('Usage shown below')
  console.log('node app.js featureBranch startBranch destBranch doDelete(true/False)')
  return
}

//Should be paramter
var passDoDelete 
var destinationBranch = args[2]
var gitBranchName = args[0]
var parentBranch = args[1]

if (args.length == 4) {
  passDoDelete = args[3] == 'true' || args[3] == 'True';
} else {
  passDoDelete = true;
}

//Find the exact commit at the start of the feature branch (where it branched off, should be on develop branch)
var gitParentCommit = execSync('git merge-base ' + parentBranch + ' ' + gitBranchName).toString('utf8');
gitParentCommit = gitParentCommit.replace('\n','')

//List of files added on branch
var addedFilesRaw =  fs.readFileSync('./addedFiles.txt', 'utf8');
var addedFiles = addedFilesRaw.split(splitter)

if (addedFiles[addedFiles.length - 1] == '') {
  addedFiles.pop()
}

readChangedFile()
readChangedFilesForObject()
readChangedFilesForLayouts()
readChangedFilesForApps()
readChangedFilesForFlexi()
readChangedFilesForReset();

function readChangedFile(){
    var temp = fs.readFileSync( './changedFiles.txt', 'utf8');
    changedFiles = temp.split(splitter)
    changedFiles.pop()
}

function readChangedFilesForReset() {
  var done = []
  var typesToReset = []
  //adapt! to check for object mode and object file ending on files.txt
  for (cf of changedFiles) {
    if ((cf.includes('.flow') || (cf.includes('.flowDefinition')) || (cf.includes('.workflow'))) && !done.includes(cf)) {
      done.push(cf)

      try {
        execSync('git checkout '+gitBranchName + ' -- ' + cf)
      } catch (err) {
        console.error('Couldnt reset merge changes to '+ cf)
        console.error(err)
      }

    }
  }
}

function readChangedFilesForApps() {
  //adapt! to check for object mode and object file ending on files.txt
  
  for (cf of changedFiles) {
    if (cf.includes('.app') && !cf.includes('.appMenu') && !cf.includes('.approvalProcess') && !apps.includes(cf)) {
      apps.push(cf)
    }
  }
  processApps();
}

function readChangedFilesForObject() {
  //adapt! to check for object mode and object file ending on files.txt
  for (cf of changedFiles) {
    if (cf.includes('.object') && !cf.includes('.objectTranslation') && !objects.includes(cf)) {
      objects.push(cf)
    }
  }
  processObjects();
}

function readChangedFilesForLayouts() {
  
  for (cf of changedFiles) {
    if (cf.includes('.layout') && !layouts.includes(cf)) {
      layouts.push(cf)
    }
  }
  processLayouts();
}

function readChangedFilesForFlexi() {
  
  for (cf of changedFiles) {
    if (cf.includes('.flexipage') && !flexiPages.includes(cf)) {
      flexiPages.push(cf)
    }
  }
  processFlexis();
}

function processApps() {
  for (cf of apps) {
    if (!addedFiles.includes(cf) && !finishedApps.hasOwnProperty(cf)) {
      console.log('processing ' + cf)
      var fApp = processApp(cf);
  
      var xml = parser.toXml(JSON.stringify(fApp, null, 4))

      var formattedXML = beut.xml(xml, 4);
      var lines = formattedXML.split(splitter)

      var newLine = lines[0] + lines[1]

      newLine = newLine.replace(' ','').replace(' ','').replace(splitter,'').replace('\n','')
      
      var finalLines = [alwaysAdd,newLine].concat(lines.slice(2))
      var toWrite = finalLines.join('\r\n')
      fs.writeFileSync(cf, toWrite)
      
      console.log('Successfully wrote ' + obj)
    } 
  }

}

function processApp(appFile) {
  var sourceJson, destJson, branchStartJson,  rawSource, rawBranchStart, rawDest;
  var destPath = 'destVersion.app'
  var startPath = 'BranchStartVersion.app'
  var sourcePath = 'sourceVersion.app'
  var curr = './'

  // rawSource = fs.readFileSync( curr+appFile, 'utf8')
  // sourceJson = JSON.parse(parser.toJson(rawSource, {reversible: true}));

  execSync('git show ' + gitBranchName + ':'+appFile + ' > ' + sourcePath)
  rawSource = fs.readFileSync(curr+sourcePath, 'utf8')
  sourceJson = JSON.parse(parser.toJson(rawSource, {reversible: true}));
  // console.log(sourceJson)
  var version = 'dest'
  try {
  execSync('git show ' + destinationBranch + ':'+appFile + ' > ' + destPath)
  rawDest = fs.readFileSync(curr+destPath, 'utf8')
  destJson = JSON.parse(parser.toJson(rawDest, {reversible: true}));

  version = 'parent'
  execSync('git show '+ gitParentCommit + ':' + appFile + ' > ' + startPath)
  rawBranchStart = fs.readFileSync(curr+startPath, 'utf8')
  branchStartJson = JSON.parse(parser.toJson(rawBranchStart, {reversible: true}));

 } catch (err) {
    console.error('File not found - '+version+':' + appFile)
    console.error(err)
    console.error('Returning source version')
    unlinkFiles([curr+destPath,curr+sourcePath,curr+startPath],false)
    return sourceJson
}

  var result = buildApp(sourceJson, branchStartJson, destJson);
  unlinkFiles([curr+destPath,curr+sourcePath,curr+startPath],true)
  
  return result
}

function unlinkFiles(listOfPaths,showError) {
  for (path of listOfPaths) {
    try {
      fs.unlinkSync(path_)
    } catch(err) {
      if (showError == true) {
        // console.error('error deleting file- ' + path)
        // console.log(err)
      }
    }
  }
}

function processObjects() {
  for (cf of objects) {
    if (!addedFiles.includes(cf) && !finishedObjects.hasOwnProperty(cf)) {
      console.log('processing ' + cf)
      // finishedObjects[cf] = processObject(cf);

      var obj = processObject(cf);
      var xml = parser.toXml(JSON.stringify(obj, null, 4))
      

      var formattedXML = beut.xml(xml, 4);
      var lines = formattedXML.split(splitter)

      var newLine = lines[0] + lines[1]

      newLine = newLine.replace(' ','').replace(' ','').replace(splitter,'').replace('\n','')
      
      var finalLines = [alwaysAdd,newLine].concat(lines.slice(2))
      var toWrite = finalLines.join('\r\n')
      fs.writeFileSync(cf, toWrite)
      
      console.log('Successfully wrote ' + obj)
    } 
  }

}

function processLayouts() {
  for (cf of layouts) {
    if (!addedFiles.includes(cf) && !finishedLayouts.hasOwnProperty(cf)) {
      console.log('processing ' + cf)
      var fLayout = processLayout(cf);


    var xml = parser.toXml(JSON.stringify(fLayout, null, 4))
    var formattedXML = beut.xml(xml, 4);

    var lines = formattedXML.split(splitter)

    var newLine = lines[0] + lines[1]

    newLine = newLine.replace(' ','').replace(' ','').replace(splitter,'').replace('\n','')
    
    var finalLines = [alwaysAdd,newLine].concat(lines.slice(2))
    var toWrite = finalLines.join('\r\n')
    fs.writeFileSync(cf, toWrite)
    console.log('Successfully wrote ' + lay)
    } 

  }

}

function processFlexis() {
  for (cf of flexiPages) {
    if (!addedFiles.includes(cf) && !finishedFlexiPages.hasOwnProperty(cf)) {
      console.log('processing ' + cf)
      var rFlexi = processFlexi(cf);
      var xml = parser.toXml(JSON.stringify(rFlexi, null, 4))
      var formattedXML = beut.xml(xml, 4);

      var lines = formattedXML.split(splitter)

      var newLine = lines[0] + lines[1]

      newLine = newLine.replace(' ','').replace(' ','').replace(splitter,'').replace('\n','')
      
      var finalLines = [alwaysAdd,newLine].concat(lines.slice(2))
      var toWrite = finalLines.join('\r\n')
      fs.writeFileSync(cf, toWrite)
      console.log('Successfully wrote ' + lay)
    } 
  }


}

function processFlexi(flexiFile) {
  var sourceJson, destJson, branchStartJson,  rawSource, rawBranchStart, rawDest;
  var destPath = 'destVersion.flexipage'
  var startPath = 'BranchStartVersion.flexipage'
  var sourcePath = 'sourceVersion.flexipage'
  var curr = './'


  // rawSource = fs.readFileSync( curr+objectFile, 'utf8')
  // sourceJson = JSON.parse(parser.toJson(rawSource, {reversible: true}));
  execSync('git show ' + gitBranchName + ':"'+flexiFile + '" > ' + sourcePath)
  rawSource = fs.readFileSync(curr+sourcePath, 'utf8')
  sourceJson = JSON.parse(parser.toJson(rawSource, {reversible: true}));

  delete rawSource

  var version = 'dest'
  try {
    execSync('git show ' + destinationBranch + ':"'+flexiFile + '" > ' + destPath)
    rawDest = fs.readFileSync(curr+destPath, 'utf8')
    destJson = JSON.parse(parser.toJson(rawDest, {reversible: true}));

    delete rawDest

    version = 'parent'

    execSync('git show '+ gitParentCommit + ':"' + flexiFile + '" > ' + startPath)
    rawBranchStart = fs.readFileSync(curr+startPath, 'utf8')
    branchStartJson = JSON.parse(parser.toJson(rawBranchStart, {reversible: true}));

    delete rawBranchStart

 } catch (err) {
    console.error('File not found - '+version+':' + appFile)
    console.error(err)
    console.error('Returning source version')
    unlinkFiles([curr+destPath,curr+sourcePath,curr+startPath],false)
    return sourceJson
  }

  var result = buildFlexi(sourceJson, branchStartJson, destJson);
    unlinkFiles([curr+destPath,curr+sourcePath,curr+startPath],true)
 
  return result
}

function processLayout(layoutFile) {
  var sourceJson, destJson, branchStartJson,  rawSource, rawBranchStart, rawDest;
  var destPath = 'destVersion.layout'
  var startPath = 'BranchStartVersion.layout'
  var sourcePath = 'sourceVersion.layout'
  var curr = './'


  // rawSource = fs.readFileSync( curr+objectFile, 'utf8')
  // sourceJson = JSON.parse(parser.toJson(rawSource, {reversible: true}));
  execSync('git show ' + gitBranchName + ':"'+layoutFile + '" > ' + sourcePath)
  rawSource = fs.readFileSync(curr+sourcePath, 'utf8')
  sourceJson = JSON.parse(parser.toJson(rawSource, {reversible: true}));

  delete rawSource

  var version = 'dest'

  try {

    execSync('git show ' + destinationBranch + ':"'+layoutFile + '" > ' + destPath)
    rawDest = fs.readFileSync(curr+destPath, 'utf8')
    destJson = JSON.parse(parser.toJson(rawDest, {reversible: true}));
    
    delete rawDest

    version = 'parent'  

    execSync('git show '+ gitParentCommit + ':"' + layoutFile + '" > ' + startPath)
    rawBranchStart = fs.readFileSync(curr+startPath, 'utf8')
    branchStartJson = JSON.parse(parser.toJson(rawBranchStart, {reversible: true}));

    delete rawBranchStart

 } catch (err) {
    console.error('File not found - '+version+':' + appFile)
    console.error(err)
    console.error('Returning source version')
    unlinkFiles([curr+destPath,curr+sourcePath,curr+startPath],false)
    return sourceJson
  }

  var result = buildLayout(sourceJson, branchStartJson, destJson);
    unlinkFiles([curr+destPath,curr+sourcePath,curr+startPath],true)
 
  return result
}

function processObject(objectFile) {
  var sourceJson, destJson, branchStartJson,  rawSource, rawBranchStart, rawDest;
  var destPath = 'destVersion.object'
  var startPath = 'BranchStartVersion.object'
  var sourcePath = 'sourceVersion.object'
  var curr = './'
  // rawSource = fs.readFileSync( curr+objectFile, 'utf8')
  // sourceJson = JSON.parse(parser.toJson(rawSource, {reversible: true}));

  execSync('git show ' + gitBranchName + ':'+objectFile + ' > ' + sourcePath)
  rawSource = fs.readFileSync(curr+sourcePath, 'utf8')
  sourceJson = JSON.parse(parser.toJson(rawSource, {reversible: true}));
  // console.log(sourceJson)

  delete rawSource

  var version = 'dest'


  try {
  execSync('git show ' + destinationBranch + ':'+objectFile + ' > ' + destPath)
  rawDest = fs.readFileSync(curr+destPath, 'utf8')
  destJson = JSON.parse(parser.toJson(rawDest, {reversible: true}));

  delete rawDest

  version = 'parent'

  execSync('git show '+ gitParentCommit + ':' + objectFile + ' > ' + startPath)
  rawBranchStart = fs.readFileSync(curr+startPath, 'utf8')
  branchStartJson = JSON.parse(parser.toJson(rawBranchStart, {reversible: true}));

  delete rawBranchStart

 } catch (err) {
    console.error('File not found - '+version+':' + appFile)
    console.error(err)
    console.error('Returning source version')
    unlinkFiles([curr+destPath,curr+sourcePath,curr+startPath],false)
    return sourceJson
 }

  if (passDoDelete == false) {
    return sourceJson
  }

  var resultl;

  try {
    if (passDoDelete = true) {
       result = buildRelease(sourceJson, branchStartJson, destJson);
    } else {
      result = buildMerge(sourceJson, branchStartJson, destJson);
    }
  } catch (err) {
    console.error('Couldnt merge Object, returning feature version')
    console.error(sourceJson)
    console.error(err)
    return sourceJson
  }
 
  unlinkFiles([curr+destPath,curr+sourcePath,curr+startPath],true)
  
  return result
}

function buildApp(source, start, dest) {

  var sourceApp = source['CustomApplication']
  var startApp = start['CustomApplication']
  var destApp =dest['CustomApplication']
  sourceApp['tabs'] = mergeOrderedList(sourceApp, startApp, destApp, 'tabs')
  source['CustomApplication'] = sourceApp
  return source
}

function buildFlexi(source, start, dest) {
  if (start == null && dest == null) {
    return source
  }

  var sourcePage = source['FlexiPage']
  var destPage = dest['FlexiPage']
  var startPage = start['FlexiPage']


  //If the flexiPage hasn't been changed art destination before feature just go ahead and overwrite
  if (_.isEqual(startPage, destPage)) {
    return source
  }

  //If we've both done an identical change
  if (_.isEqual(sourcePage, destPage)) {
    return source
  }

  var completeKeys = ['flexiPageRegions','template', 'quickActionList']
  
  if (sourcePage.hasOwnProperty('quickActionList')) {
    sourcePage = handleQuickActionList(sourcePage, startPage, destPage)

  } else if (destPage.hasOwnProperty('quickActionList') && !startPage.hasOwnProperty('quickActionList')) {
    sourcePage['quickActionList'] = destPage['quickActionList']
  }
  
  sourcePage['template'] = mergeTemplate(sourcePage['template'],startPage['template'], destPage['template'])
 
  if (sourcePage.hasOwnProperty('flexiPageRegions')) {
    sourcePage = handleFlexiRegion(sourcePage, startPage, destPage)

  } else if (destPage.hasOwnProperty('flexiPageRegions') && !startPage.hasOwnProperty('flexiPageRegions')) {
    sourcePage['flexiPageRegions'] = destPage['flexiPageRegions']
  }


  source['FlexiPage'] = sourcePage

  return source;

}

function handleFlexiRegion(source, start, dest) {
  var key = 'flexiPageRegions'

  var sourceList = source[key]
  var startList = start[key]
  var destList = dest[key]

  if (!Array.isArray(sourceList)) {
    sourceList = [sourceList]
  }

  if (!Array.isArray(startList)) {
    startList = [startList]
  }

  if (!Array.isArray(destList)) {
    destList = [destList]
  }

  var sourceMap = mapArrayGivenKeys2Level(sourceList, 'name', xmlKey)
  var startMap = mapArrayGivenKeys2Level(startList, 'name', xmlKey)
  var destMap = mapArrayGivenKeys2Level(destList, 'name', xmlKey)

  var keysRemovedAtDest = [...startMap.keys()].filter(function(e) {
    return !destMap.has(e)
  })

  var commonKeys = [...startMap.keys()].filter(function(e) {
    return sourceMap.has(e) && destMap.has(e)
  })

  var removedSource = [...startMap.keys()].filter(function(e) {
    return !sourceMap.has(e)
  })

  for (elem of removedSource) {
    if (destMap.has(elem)) {
      destMap.delete(elem)
    }
    if(startMap.has(elem)) {
      startMap.delete(elem)
    }
  }


  for (elem of keysRemovedAtDest) {
    if (sourceMap.has(elem)) {
      sourceMap.delete(elem)
    }
    if(startMap.has(elem)) {
      startMap.delete(elem)
    }
  }

  for (elem of commonKeys) {
    if (!_.isEqual(sourceMap.get(elem), destMap.get(elem))) {
      if (!_.isEqual(sourceMap.get(elem), startMap.get(elem))) {
        sourceMap.set(elem, mergeFlexiRegion(sourceMap.get(elem), startMap.get(elem), destMap.get(elem)))
      } else {
        sourceMap.set(elem, destMap.get(elem))
      }
    }
  }

  var sourceEdges = getEdges([...sourceMap.keys()])
  var destEdges = getEdges([...destMap.keys()])
  var startEdges = getEdges([...startMap.keys()])
  var destEdgesDist = destEdges.filter(function(e) {
    return !sourceEdges.includes(e) 
  })

  var destEdgeFinal = []

  var sourceEdgesFinal = []

  for (edge of sourceEdges) {
    var comp = [edge[0], edge[1]]
    var safe = true
    for (aEdge of startEdges) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      sourceEdgesFinal.push(edge)
    }
  }

  for (edge of destEdgesDist) {
    var comp = [edge[1], edge[0]]
    var comp3 = [edge[0], edge[1]]
    var safe = true
    for (aEdge of sourceEdgesFinal) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      destEdgeFinal.push(edge)
    }
  }
  
    var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
  var finalOrder = toposort(graph)
  var finalOrderDistinct = new Map()
  var returnList = []
  for (elem of finalOrder) {
    if (elem != null && !finalOrderDistinct.has(elem[xmlKey])) {

      finalOrderDistinct.set(elem[xmlKey], elem)
    } 
  }

  for (elem of finalOrderDistinct) {
    if (sourceMap.has(elem)) {
      returnList.push(sourceMap.get(elem))
    } else {
      returnList.push(destMap.get(elem))
    }
  }
  sourceList = returnList
  if (sourceList.length == 1) {
    sourceList = sourceList[0]
  }
  source['flexiPageRegions'] = sourceList

  return source;
}

function mergeFlexiRegion(source, start, dest) {
  for (k in source) {
    if (k == 'componentInstances') {
      var presentAtStart = start.hasOwnProperty(k)
      var presentAtDest = dest.hasOwnProperty(k)  

      if (presentAtStart == false && presentAtDest == true) {
        source[k] = mergeComponentInstances(source[k], [], dest[k])
      } else  if (presentAtStart == true && presentAtDest == false) {
          if (_.isEqual(source[k], start[k])) {
            delete source[k]
          }
      } else  if (presentAtStart == true && presentAtDest == true) {
        source[k] = mergeComponentInstances(source[k], start[k], dest[k])

      }

    } else {
      var presentAtStart = start.hasOwnProperty(k)
      var presentAtDest = dest.hasOwnProperty(k)

      if (presentAtStart == false && presentAtDest == false) {
        continue
      } else if (presentAtStart == true && presentAtDest == true)
        if (!_.isEqual(source[k], dest[k])) {
          if (_.isEqual(source[k], start[k])) P
            source[k] = dest[k]
        }
    }
  }
}

function mergeComponentInstances(source, start, dest) {
  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKeys2Level(source, 'componentName', xmlKey) 
  var startMap = mapArrayGivenKeys2Level(start, 'componentName', xmlKey) 
  var destMap = mapArrayGivenKeys2Level(dest, 'componentName', xmlKey) 

  var keysRemovedAtDest = [...startMap.keys()].filter(function(e) {
    return !destMap.has(e)
  })

  var commonKeys = [...startMap.keys()].filter(function(e) {
    return sourceMap.has(e) && destMap.has(e)
  })

  var removedSource = [...startMap.keys()].filter(function(e) {
    return !sourceMap.has(e)
  })

  for (elem of removedSource) {
    if (destMap.has(elem)) {
      destMap.delete(elem)
    }
    if(startMap.has(elem)) {
      startMap.delete(elem)
    }
  }


  for (elem of keysRemovedAtDest) {
    if (sourceMap.has(elem)) {
      sourceMap.delete(elem)
    }
    if(startMap.has(elem)) {
      startMap.delete(elem)
    }
  }

  for (elem of commonKeys) {
    if (!_.isEqual(sourceMap.get(elem), destMap.get(elem))) {
      if (!_.isEqual(sourceMap.get(elem), startMap.get(elem))) {
        sourceMap.set(elem, mergeComponentInstance(sourceMap.get(elem), startMap.get(elem), destMap.get(elem)))
      } else {
        sourceMap.set(elem, destMap.get(elem))
      }
    }
  }

  var sourceEdges = getEdges([...sourceMap.keys()])
  var destEdges = getEdges([...destMap.keys()])
  var startEdges = getEdges([...startMap.keys()])
  var destEdgesDist = destEdges.filter(function(e) {
    return !sourceEdges.includes(e) 
  })

  var destEdgeFinal = []

  var sourceEdgesFinal = []

  for (edge of sourceEdges) {
    var comp = [edge[0], edge[1]]
    var safe = true
    for (aEdge of startEdges) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      sourceEdgesFinal.push(edge)
    }
  }

  for (edge of destEdgesDist) {
    var comp = [edge[1], edge[0]]
    var comp3 = [edge[0], edge[1]]
    var safe = true
    for (aEdge of sourceEdgesFinal) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      destEdgeFinal.push(edge)
    }
  }
  
    var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
  var finalOrder = toposort(graph)
  var finalOrderDistinct = new Map()
  var returnList = []
  for (elem of finalOrder) {
    if (elem != null && !finalOrderDistinct.has(elem[xmlKey])) {

      finalOrderDistinct.set(elem[xmlKey], elem)
    } 
  }

  for (elem of finalOrderDistinct) {
    if (sourceMap.has(elem)) {
      returnList.push(sourceMap.get(elem))
    } else {
      returnList.push(destMap.get(elem))
    }
  }
}

function mergeComponentInstance(source, start, dest) {
  if (source.hasOwnProperty('visibilityRule')) {
    source = handleVisibilityRule(source,start,dest)
  } else if (dest.hasOwnProperty('visibilityRule') && !start.hasOwnProperty('visibilityRule')) {
    source['visibilityRule'] = dest['visibilityRule']
  }

  if (source.hasOwnProperty('componentInstanceProperties')) {
    source['componentInstanceProperties'] = handleInstanceProperties(source, start, dest)

  } else if (dest.hasOwnProperty('componentInstanceProperties') && !start.hasOwnProperty('componentInstanceProperties')) {
    source['componentInstanceProperties'] = dest['componentInstanceProperties']
  }

  return source;
}

function handleVisibilityRule(source, start, dest) {
  var key = 'visibilityRule'
  var presentAtStart = start.hasOwnProperty(key) 
  var presentAtDest = dest.hasOwnProperty(key) 

  

  if (!_.isEqual(source[key],dest[key])){

    if (presentAtStart == true && presentAtDest == false) {
      if (_.isEqual(source[key], start[key])){
        delete source[key]
      }
      return source
    } 

    if (presentAtStart == true && presentAtDest == true) {
      source[key] = mergeVisRule (source[key], start[key], dest[key])
    }
    
  }
  
  return source
}

function mergeVisRule(source,start,dest) {
  var keys = ['booleanFilter','criteria']
  
  for (key of keys) {
    var presentAtStart = start.hasOwnProperty(key) 
    var presentAtDest = dest.hasOwnProperty(key) 

    if (!_.isEqual(source[key],dest[key])){

      if (presentAtStart == true && presentAtDest == false) {
        if (_.isEqual(source[key], start[key])){
          delete source[key]
        }
      } 

      if (presentAtStart == true && presentAtDest == true) {
        if (!_.isEqual(start[key], dest[key])) {
          if (isEqual(source[key],start[key])) {
            source[key] = dest[key]
          }
        } 
      }
      
    }
  }
  
  return source
}

function handleInstanceProperties(source, start, dest) {
  var key = 'componentInstanceProperties'

  var presentAtStart = start.hasOwnProperty(key) 
  var presentAtDest = dest.hasOwnProperty(key) 

  if (presentAtStart == false && presentAtDest == true) {
    source[key] = mergeInstanceProperty(source[key], [], dest[key])
  } else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(source[key], start[key])) {
      delete source[key]
    }

  } else if (presentAtDest == true && presentAtStart == true) {
    source[key] = mergeInstanceProperty(source[key], start[key], dest[key])

  }

 return source
}

function mergeInstanceProperty(source, start, dest) {
  
  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKeys2Level(source, 'name', xmlKey)
  var startMap = mapArrayGivenKeys2Level(start, 'name', xmlKey)
  var destMap = mapArrayGivenKeys2Level(dest, 'name', xmlKey)

  var removed = [...startMap.keys()].filter(function(e) {
    return !destMap.has(e)
  })

  var removedSource = [...startMap.keys()].filter(function(e) {
    return !sourceMap.has(e)
  })
  
  var commonKeys;

  if ([...startMap.keys()].length == 0) {
    commonKeys = [...sourceMap.keys()].filter(function(e) {
      return destMap.has(e)
    }) 
  } else {
    commonKeys = [...startMap.keys()].filter(function(e) {
      return sourceMap.has(e) && destMap.has(e)
    })
  }
  

  for (elem of removedSource) {
    if (destMap.has(elem)) {
      destMap.delete(elem)
    }
  }

  for (elem of removed) {
    if (sourceMap.has(elem)) {
      sourceMap.delete(elem)
    }
  }

  for (elem of commonKeys) {
    if (!_.isEqual(sourceMap.get(elem), destMap.get(elem))) {
      var theObj = sourceMap.get(elem)
      for (e in theObj ) {
        if (_.isEqual(e, startMap.get(elem)[e]) && !_.isEqual(e,destMap.get(elem)[e])) {
          theObj[e] = destMap.get(elem)[e]
        }
      }
      sourceMap.set(elem,theObj)
    }
  }

  var sourceEdges = getEdges([...sourceMap.keys()])
  var destEdges = getEdges([...destMap.keys()])
  var startEdges = getEdges([...startMap.keys()])

  var destEdgeFinal = []

  var sourceEdgesFinal = []

  for (edge of sourceEdges) {
    var comp = [edge[0], edge[1]]
    var safe = true
    for (aEdge of startEdges) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      sourceEdgesFinal.push(edge)
    }
  }

  for (edge of destEdges) {
    var comp = [edge[1], edge[0]]
    var comp3 = [edge[0], edge[1]]
    var safe = true
    for (aEdge of sourceEdgesFinal) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      destEdgeFinal.push(edge)
    }
  }

    var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
  var finalOrder = toposort(graph)

  var finalOrderDistinct = new Map()

  for (elem of finalOrder) {
    if (elem != null && !finalOrderDistinct.has(elem)) {
      finalOrderDistinct.set(elem,elem);
    }
  }

  var returnList = []

  for (elem of [...finalOrderDistinct.keys()]) {
    if (sourceMap.has(elem)) {
      returnList.push(sourceMap.get(elem))
    } else {
      returnList.push(destMap.get(elem))
    }
  }
  

  return returnList

}

function mergeTemplate(source, start, dest) {
  if (!_.isEqual( source['name'],dest['name'])) {
    if(_.isEqual(source['name'], start['name'])) {
      source['name'] = dest['name']
    } 
  }

  return source

}

function buildLayout (source, start, dest) {
  if (start == null && dest == null) {
    return source
  }

  var sourceLayout = source['Layout']
  var startLayout = start['Layout']
  var destLayout = dest['Layout']

  //If the layout hasn't been changed art destination before feature just go ahead and overwrite
  if (_.isEqual(startLayout, destLayout)) {
    return source
  }
  
  //If we've both done an identical change
  if (_.isEqual(sourceLayout, destLayout)) {
    return source
  }
  var simpleKeys = ['emailDefault','runAssignmentRulesDefault', 'showEmailCheckbox' , 'showHighlightsPanel','showInteractionLogPanel' ,'showKnowledgeComponent', 'showRunAssignmentRulesCheckbox' ,'showSolutionSection' , 'showSubmitAndAttachButton' ]
  var currentKey = 'customButtons'

  if (sourceLayout.hasOwnProperty(currentKey)) {

    sourceLayout = topHandleButtons(sourceLayout, startLayout, destLayout, currentKey)

  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]
  } 

  currentKey = 'excludeButtons'

  if (sourceLayout.hasOwnProperty(currentKey)) {
    sourceLayout = topHandleButtons(sourceLayout, startLayout, destLayout, currentKey)

  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]
  } 

  currentKey = 'multilineLayoutFields'

  if (sourceLayout.hasOwnProperty(currentKey)) {
    sourceLayout = topHandleButtons(sourceLayout, startLayout, destLayout, currentKey)

  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]
  } 

  currentKey = 'relatedObjects'
  if (sourceLayout.hasOwnProperty(currentKey)) {
    sourceLayout = topHandleButtons(sourceLayout, startLayout, destLayout, currentKey)

  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]
  } 

  currentKey = 'feedLayout'

  if (sourceLayout.hasOwnProperty(currentKey)) {
    sourceLayout = handleFeedLayout(sourceLayout, startLayout, destLayout)

  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]
  } 

  currentKey = 'platformActionList'
  
  if (sourceLayout.hasOwnProperty(currentKey)) {
    sourceLayout = handlePlatformActionList(sourceLayout, startLayout, destLayout, currentKey)

  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]
  } 

  currentKey = 'quickActionList'
  
  if (sourceLayout.hasOwnProperty(currentKey)) {
    sourceLayout = handleQuickActionList(sourceLayout, startLayout, destLayout)

  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]
  } 

  currentKey = 'relatedContent'
  if (sourceLayout.hasOwnProperty(currentKey)) {
    sourceLayout = handleRelatedContent(sourceLayout, startLayout, destLayout)

  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]
  } 

  currentKey = 'relatedLists'
  if (sourceLayout.hasOwnProperty(currentKey)) {
    sourceLayout = handleRelatedLists(sourceLayout, startLayout, destLayout)

  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]
  } 
  
  currentKey = 'layoutSections'

  if (sourceLayout.hasOwnProperty(currentKey)) {
    sourceLayout = handleLayoutSections(sourceLayout, startLayout, destLayout)
  } else if (destLayout.hasOwnProperty(currentKey) && !startLayout.hasOwnProperty(currentKey)) {
    sourceLayout[currentKey] = destLayout[currentKey]

    if (destLayout.hasOwnProperty('miniLayout')) {
      sourceLayout['miniLayout'] = destLayout['miniLayout']
    }

  } 

  for (key of simpleKeys) {
    if (sourceLayout.hasOwnProperty(key)) {
      var presentAtStart = startLayout.hasOwnProperty(key) 
      var presentAtDest = destLayout.hasOwnProperty(key)
      
      if (presentAtStart == true && presentAtDest == true) {
        if (!_.isEqual(destLayout[key], sourceLayout[key])) {
          if (_.isEqual(sourceLayout[key], startLayout[key])) {
            sourceLayout[key] = destLayout[key]
          } 
        }
      } 
      
    } else if (!startLayout.hasOwnProperty(key) && destLayout.hasOwnProperty(key)) {
      sourceLayout[key] = destLayout[key]
    }
  }

  source['Layout'] = sourceLayout

  return source

}

function handleLayoutSections(sourceLayout, startLayout, destLayout) {
  var key = 'layoutSections'
  var presentAtStart = startLayout.hasOwnProperty(key) 
  var presentAtDest = destLayout.hasOwnProperty(key) 

  if (presentAtStart == false && presentAtDest == false) {
    
  } else if (presentAtStart == false && presentAtDest == true) {
    //2way merge
    sourceLayout[key] = mergeLayoutSections(sourceLayout[key], [], destLayout[key])
  }else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(sourceLayout[key], startLayout[key])){
      delete sourceLayout[key]
    }
    return sourceLayout
  } else {
    sourceLayout[key] = mergeLayoutSections(sourceLayout[key], startLayout[key], destLayout[key])
  }

  key = 'miniLayout'

  var presentAtStart = startLayout.hasOwnProperty(key) 
  var presentAtDest = destLayout.hasOwnProperty(key) 

  if (presentAtStart == false && presentAtDest == false) {
    return sourceLayout
  } else if (presentAtStart == false && presentAtDest == true) {
    sourceLayout[key] = mergeMiniLayout(sourceLayout[key], [], destLayout[key])
  }else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(sourceLayout[key], startLayout[key])){
      delete sourceLayout[key]
    }
    return sourceLayout
  } else {
    sourceLayout[key] = mergeMiniLayout(sourceLayout[key], startLayout[key], destLayout[key])
  }

  return sourceLayout

}

function mergeMiniLayout(source, start, dest) {

  var key = 'fields'

  if (source.hasOwnProperty(key)) {
    if (start == null) {

    } else {
      var presentAtStart = start.hasOwnProperty(key) 
      var presentAtDest = dest.hasOwnProperty(key) 
  
      if (presentAtStart == true && presentAtDest == false) {
        if (_.isEqual(start[key], source[key])) {
          delete source[key]
        }
      } else if (presentAtStart == true && presentAtDest == true) {
        source[key] = mergeOrderedList(source, start, dest, key)
      } else if (presentAtStart == false && presentAtDest == true) {
        source[key] = mergeOrderedList (source, {} , dest, key)
      } 
    }
  } else if (!startMap.hasOwnProperty(key) && destMap.hasOwnProperty(key)) {
    source[key] = dest[key] 
  }
  
  return source
}

function findFieldColumnMapping(layoutSection) {
  
  var returnFields = new Map()
  for (var ls of layoutSection) {

    var columns = ls['layoutColumns']
    if (columns == null) {
      return returnFields
    }

    if (!Array.isArray(columns)) {
      columns = [columns]
    }
    var i = 0;
    var blanSpace = 0
    for (var col of columns) {
      var layoutItems = col['layoutItems']
      if (layoutItems == null) {
        continue
      }
      if (!Array.isArray(layoutItems)){
        layoutItems = [layoutItems]
      }
      for (item of layoutItems) {
        if (item.hasOwnProperty('field')) {
          returnFields.set(item['field'][xmlKey],i)
        } else if (item.hasOwnProperty('customLink')) {
          returnFields.set(item['customLink'][xmlKey],i)

        } else if (item.hasOwnProperty('component')) {
          returnFields.set(item['component'][xmlKey],i)

        } else if (item.hasOwnProperty('page')) {
          returnFields.set(item['page'][xmlKey],i)

        } else {
          returnFields.set('emptySpace'+blanSpace, i)
          blank+=1
        }
      }
      i+=1
    }
  }
  return returnFields
}

function findAllFields(layoutSection) {
  var returnFields = new Map()

  if (!Array.isArray(layoutSection)) {
    layoutSection = [layoutSection]
  }
  for (var ls of layoutSection) {

    var columns = ls['layoutColumns']
    if (columns == null) {
      return returnFields
    }

    if (!Array.isArray(columns)) {
      columns = [columns]
    }

    var blank = 0

    for (var col of columns) {
      var layoutItems = col['layoutItems']
      if (layoutItems == null) {
        continue
      }
      if (!Array.isArray(layoutItems)){
        layoutItems = [layoutItems]
      }
      for (item of layoutItems) {

        if (item.hasOwnProperty('field')) {
          returnFields.set(item['field'][xmlKey],ls['label'][xmlKey])
        } else if (item.hasOwnProperty('customLink')) {
          returnFields.set(item['customLink'][xmlKey],ls['label'][xmlKey])

        } else if (item.hasOwnProperty('component')) {
          returnFields.set(item['component'][xmlKey],ls['label'][xmlKey])

        } else if (item.hasOwnProperty('page')) {
          returnFields.set(item['page'][xmlKey],ls['label'][xmlKey])

        } else {
          returnFields.set('emptySpace'+blank, ls['label'][xmlKey])
          blank+=1
        }
      }
    }
  }

  return returnFields
}

function findLayoutToField(layoutSection) {
  var returnFields = new Map()

  if (!Array.isArray(layoutSection)) {
    layoutSection = [layoutSection]
  }
  for (var ls of layoutSection) {

    var columns = ls['layoutColumns']
    if (columns == null) {
      return returnFields
    }

    if (!Array.isArray(columns)) {
      columns = [columns]
    }

    var layoutItemList = []
    var blank = 0;

    for (var col of columns) {
      var layoutItems = col['layoutItems']
      if (layoutItems == null) {
        continue
      }
      if (!Array.isArray(layoutItems)){
        layoutItems = [layoutItems]
      }
      for (item of layoutItems) {
        if (item.hasOwnProperty('field')) {
          layoutItemList.push(item['field'][xmlKey])
        } else if (item.hasOwnProperty('customLink')) {
          layoutItemList.push(item['customLink'][xmlKey])

        } else if (item.hasOwnProperty('component')) {
          layoutItemList.push(item['component'][xmlKey])

        } else if (item.hasOwnProperty('page')) {
          layoutItemList.push(item['page'][xmlKey])

        } else {
          layoutItemList.push('emptySpace'+blank)
          blank+=1
        }
      }
    }
    returnFields.set(ls['label'][xmlKey], layoutItemList)
  }

  return returnFields
}


//If you are looking into this method i wish you the most luck in the world
function mergeLayoutSections(source, start, dest) {
  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKeys2Level(source, 'label', xmlKey)
  var startMap = mapArrayGivenKeys2Level(start, 'label', xmlKey)
  var destMap = mapArrayGivenKeys2Level(dest, 'label', xmlKey)

  var sourceItemSectionMap = findAllFields([...sourceMap.values()])
  var startItemSectionMap = findAllFields([...startMap.values()])
  var destItemSectionMap = findAllFields([...destMap.values()])

  var sourceFields = [...sourceItemSectionMap.keys()]
  var startFields = [...startItemSectionMap.keys()]
  var destFields = [...destItemSectionMap.keys()]

  var fieldsAddedInDest = destFields.filter(function(e){
    return !startFields.includes(e)
  })

  var fieldsAddedInSource = sourceFields.filter(function(e){
    return !startFields.includes(e)
  })

  var fieldsRemovedDest = [...startItemSectionMap.keys()].filter(function(e){
    return !destItemSectionMap.has(e)
  })

  var fieldsRemovedSource = [...startItemSectionMap.keys()].filter(function(e){
    return !sourceItemSectionMap.has(e)
  })
 
  var sourceSectionItemMap = findLayoutToField([...sourceMap.values()])
  var startSectionItemMap = findLayoutToField([...startMap.values()])
  var destSectionItemMap = findLayoutToField([...destMap.values()])

  var sectionsRemovedDest = [...startSectionItemMap.keys()].filter(function(e){
    return !destSectionItemMap.has(e)
  })

  var sectionsRemovedSource = [...startSectionItemMap.keys()].filter(function(e){
    return !sourceSectionItemMap.has(e)
  })

  var renameMapDest = new Map()
  var renameMapSource = new Map()

  var deletedSectionDest = []
  var deletedSectionSource = []

  for (section of sectionsRemovedDest) {

    var renameFound = false

    for (destSection of [...destSectionItemMap.keys()]) {
      if (!startMap.has(destSection)) {
        
        var startSection = startSectionItemMap.get(section).sort()
        var possSection = destSectionItemMap.get(destSection)

        var withoutNew = possSection.filter(function(e) {
          return !fieldsAddedInDest.includes(e)
        }).sort()

        var withourRem = startSection.filter(function(e) {
          return fieldsRemovedDest.includes(e)
        }).sort()

        if(_.isEqual(withoutNew, withourRem)) {
          renameMapDest.set(section, destSection)
          break
        }

      }
    }

    if (renameFound == false && !deletedSectionDest.includes(section)) {
      //Go through all fields not blanks that have been moved , find where 

      deletedSectionDest.push(section)
    }
  }

  for (section of sectionsRemovedSource) {

    var renameFound = false

    for (sourceSection of [...sourceSectionItemMap.keys()]) {
      if (!startMap.has(sourceSection)) {
        
        var startSection = startSectionItemMap.get(section).sort()
        var possSection = sourceSectionItemMap.get(sourceSection)

        var withoutNew = possSection.filter(function(e) {
          return !fieldsAddedInSource.includes(e)
        }).sort()

        var withourRem = startSection.filter(function(e) {
          return !fieldsRemovedSource.includes(e)
        }).sort()

        if(_.isEqual(withoutNew, withourRem)) {
          renameMapSource.set(section, destSection)
          break
        }

      }
    }

    if (renameFound == false && !deletedSectionSource.includes(section)) {
      //Go through all fields not blanks that have been moved , find where 

      deletedSectionSource.push(section)
    }
  }

  //Handle renamed sections

  for (section of [...renameMapDest.keys()]) {
    var newSection = renameMapDest.get(section)
    
    for (let [k,v] of sourceItemSectionMap) {
      if (v == section) {
        sourceItemSectionMap.set(k, newSection)
      }
    }

    sourceSectionItemMap.set(newSection, sourceSectionItemMap.get(section))
    sourceSectionItemMap.delete(section)

    for (let [k,v] of startItemSectionMap) {
      if (v == section) {
        startItemSectionMap.set(k, newSection)
      }
    }

    startSectionItemMap.set(newSection, startSectionItemMap.get(section))
    startSectionItemMap.delete(section)

    var newSourceMap = newMap()
    var newStartMap = newMap()

    for (let [k, v] of sourceMap) {
      if (k == section) {
        newSourceMap.set(newSection,v)
      } else {
        newSourceMap.set(k,v)
      }
    }

    for (let [k, v] of startMap) {
      if (k == section) {
        newStartMap.set(newSection,v)
      } else {
        newStartMap.set(k,v)
      }
    }

    sourceMap = newSourceMap
    startMap = newStartMap
    
  }

  for (section of [...renameMapSource.keys()]) {
    var newSection = renameMapSource.get(section)
    
    for (let [k,v] of destItemSectionMap) {
      if (v == section) {
        destItemSectionMap.set(k, newSection)
      }
    }

    destSectionItemMap.set(newSection, destSectionItemMap.get(section))
    destSectionItemMap.delete(section)

    for (let [k,v] of startItemSectionMap) {
      if (v == section) {
        startItemSectionMap.set(k, newSection)
      }
    }

    startSectionItemMap.set(newSection, startSectionItemMap.get(section))
    startSectionItemMap.delete(section)

    var newDestMap = newMap()
    var newStartMap = newMap()

    for (let [k, v] of destMap) {
      if (k == section) {
        newDestMap.set(newSection,v)
      } else {
        newDestMap.set(k,v)
      }
    }

    for (let [k, v] of startMap) {
      if (k == section) {
        newStartMap.set(newSection,v)
      } else {
        newStartMap.set(k,v)
      }
    }

    destMap = newDestMap
    startMap = newStartMap
  }
  
  //Delete sections removed at dest from source and start
  for (section of deletedSectionDest) {
    var deletedItems = []
    if (startSectionItemMap.has(section)) {
      startSectionItemMap.delete(section)
    }
    if (sourceSectionItemMap.has(section)) {
      sourceSectionItemMap.delete(section)
    }

    
    for (let [k,v] of sourceItemSectionMap) {
      if (v == section) {
        deletedItems.push(k)
      }
    }

    for (el of deletedItems) {
      sourceItemSectionMap.delete(el)
    }
  

    keysToDelete = []
    deletedItems = []
    

    for (let [k,v] of startSectionItemMap) {
      if (v == section) {
        deletedItems.push(k)
      }
    }

    for (el of deletedItems) {
      startItemSectionMap.delete(el)
    }

    sourceMap.delete(section)
    startMap.delete(section)

  }

  //Delete sections removed at source from source and start
  for (section of deletedSectionSource) {
    var deletedItems = []
    if (startSectionItemMap.has(section)) {
      startSectionItemMap.delete(section)
    }
    if (destSectionItemMap.has(section)) {
      destSectionItemMap.delete(section)
    }

    
    for (let [k,v] of destItemSectionMap) {
      if (v == section) {
        deletedItems.push(k)
      }
    }

    for (el of deletedItems) {
      destItemSectionMap.delete(el)
    }

    deletedItems = []
    

    for (let [k,v] of startSectionItemMap) {
      if (v == section) {
        deletedItems.push(k)
      }
    }

    for (el of deletedItems) {
      startItemSectionMap.delete(el)
    }


    destMap.delete(section)
    startMap.delete(section)
  }

  var deleteInSource = []
  //for every section -- if its not equal to dest merge it
  for (let[k , v] of sourceMap) {
    if (destMap.has(k)) {
      if (!_.isEqual(v, destMap.get(k))) {
        sourceMap.set(k, mergeLayoutSectionIndiv(sourceMap.get(k), startMap.get(k), destMap.get(k), k))
      }
    } else {
      if (startMap.has(k)) {
        if (_.isEqual(startMap.get(k), v)) {
          deleteInSource.push(k)
        }
      } 
    }
  }

  for (e of deleteInSource) {
    sourceMap.delete(e)
  }

  var sourceEdges = getEdges([...sourceMap.keys()])
  var destEdges = getEdges([...destMap.keys()])
  var startEdges = getEdges([...startMap.keys()])
  var destEdgeFinal = []

  var sourceEdgesFinal = []

  for (edge of sourceEdges) {
    var comp = [edge[0], edge[1]]
    var safe = true
    for (aEdge of startEdges) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      sourceEdgesFinal.push(edge)
    }
  }

  for (edge of destEdges) {
    var comp = [edge[1], edge[0]]
    var comp3 = [edge[0], edge[1]]
    var safe = true
    for (aEdge of sourceEdgesFinal) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      destEdgeFinal.push(edge)
    }
  }

    var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
  var finalOrder = toposort(graph)
  var finalOrderDistinct = new Map()

  for (elem of finalOrder) {
    if (elem != null && !finalOrderDistinct.has(elem)) {
      finalOrderDistinct.set(elem,elem);
    }
  }

  var returnList = []
  for (elem of [...finalOrderDistinct.keys()]) {
    if (sourceMap.has(elem)) {
      returnList.push(sourceMap.get(elem))
    } else {
      returnList.push(destMap.get(elem))
    }
  }

  if (returnList.length == 1) {
    returnList = returnList[0]
  } 

  return returnList

}

function mergeLayoutSectionIndiv(source, start , dest, name) {
  var changedDuringBranch, differentToDest, changesBetweenStartDest

  if (start == null) {
    differentToDest = !_.isEqual(source[el], dest[el]);

    console.error('Section added by dest and source - Section :' + name)
    console.error('returning destination columns')
    return dest

  } else {
    for (el in source) {

      changedDuringBranch = !_.isEqual(start[el], source[el]);
      differentToDest = !_.isEqual(source[el], dest[el]);
      changesBetweenStartDest = !_.isEqual(dest[el], start[el]);

      if (el == 'layoutColumns') {
        source[el] = mergeLayoutColumns(source[el], start[el], dest[el],name)
      } else if (el == 'style') {
        if (!_.isEqual(dest[el], start[el])) {
          source[el] = dest[el]
        }
      } else {

        if (differentToDest == true) {
          if (changesBetweenStartDest == true) {
            if (changedDuringBranch == false) {
              source[el] = dest[el]
            } 
          } 
        } 

      }
    }

  }
  return source;
}

function mergeLayoutColumns(source,start,dest) {


  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  if (dest.length != start.length) {
    console.error('Column layout changed - Cannot merge - Section : ' + name)
    console.error('returning Destination version')
    return dest
  }

  if (source.length != start.length) {
    console.error('Column layout changed - Cannot merge - Section : ' + name)
    console.error('returning Source version')
    return source
  }

  var i = 0;
  for (var col of source) {

    if (col.hasOwnProperty('layoutItems') ) {
      var sourceMap = mapLayoutItems(col['layoutItems'])
      var startMap = mapLayoutItems(start[i]['layoutItems'])
      var destMap = mapLayoutItems(dest[i]['layoutItems'])

      var changedDuringBranch, changesBetweenStartDest, differentToDest

      var removedDest = [...startMap.keys()].filter(function(e) {
        return !destMap.has(e)
      })

      var removedSource = [...startMap.keys()].filter(function(e) {
        return !sourceMap.has(e)
      })
      for (el of removedDest) {
        if (sourceMap.has(el)) {
          sourceMap.delete(el)
        }

        if (startMap.has(el)) {
          startMap.delete(el)
        }
      }

      for (el of removedSource) {
        if (destMap.has(el)) {
          destMap.delete(el)
        }

        if (startMap.has(el)) {
          startMap.delete(el)
        }
      }

      for (let [k, v] of sourceMap) {
        if (destMap.has(k)) {
          changedDuringBranch = !_.isEqual(v, startMap.get(k))
          differentToDest = !_.isEqual(v, destMap.get(k))

          if (differentToDest == true) {
            if (changedDuringBranch == false) {
              sourceMap.set(k, destMap.get(k))
            }
          }

        }
      }

      var sourceEdges = getEdges([...sourceMap.keys()])
      var destEdges = getEdges([...destMap.keys()])
      var startEdges = getEdges([...startMap.keys()])
      var destEdgeFinal = []

      var sourceEdgesFinal = []

      for (edge of sourceEdges) {
        var comp = [edge[0], edge[1]]
        var safe = true
        for (aEdge of startEdges) {
          var comp2 = [aEdge[0], aEdge[1]]
          if (_.isEqual(comp,comp2)) {
            safe = false
          }
        }

        if (safe == true) {
          sourceEdgesFinal.push(edge)
        }
      }

      for (edge of destEdges) {
        var comp = [edge[1], edge[0]]
        var comp3 = [edge[0], edge[1]]
        var safe = true
        for (aEdge of sourceEdgesFinal) {
          var comp2 = [aEdge[0], aEdge[1]]
          if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
            safe = false
          }
        }

        if (safe == true) {
          destEdgeFinal.push(edge)
        }
      }

        var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
      var finalOrder = toposort(graph)
      var finalOrderDistinct = new Map()

      for (elem of finalOrder) {
        if (elem != null && !finalOrderDistinct.has(elem)) {
          finalOrderDistinct.set(elem,elem);
        }
      }

      var returnList = []
      for (elem of [...finalOrderDistinct.keys()]) {
        if (sourceMap.has(elem)) {
          returnList.push(sourceMap.get(elem))
        } else {
          returnList.push(destMap.get(elem))
        }
      }

      if (returnList.length == 1) {
        returnList = returnList[0]
      } 

      col['layoutItems'] = returnList
      source[i] = col

      i+=1
    } else if (dest[i].hasOwnProperty('layoutItems')) {
      if (start[i].hasOwnProperty('layoutItems')) {
        if (!_.isEqual(start[i]['layoutItems'], dest[i]['layoutItems'])) {
          source[i]['layoutItems'] = dest[i]['layoutItems']
        } 
      } else {
        source[i]['layoutItems'] = dest[i]['layoutItems']
      }
    }
    
  }



  return source

}

function mergeOrderedList(source, start, dest, key) {
  if (!Array.isArray(source[key])) {
    source[key] = [source[key]]
  }

  if (!Array.isArray(start[key])) {
    start[key] = [start[key]]
  }

  if (!Array.isArray(dest[key])) {
    dest[key] = [dest[key]]
  }

  var removed = start[key].filter(function(e) {
    return !dest[key].includes(e)
  })

  var removedSource = start[key].filter(function(e) {
    return !source[key].includes(e)
  })

  var newOnesDest = dest[key].filter(function(e) {
    return !source[key].includes(e) && !start[key].includes(e)
  })


  var commonKeys;

  if (start.length == 0) {
    commonKeys = source[key].filter(function(e) {
      return dest[key].includes(e)
    }) 
  } else {
    commonKeys = start[key].filter(function(e) {
      return source[key].includes(e) && dest[key].includes(e)
    })
  }

  source[key] = source[key].filter(function(e) {
    return !removed.includes(e)
  })

  dest[key] = dest[key].filter(function(e) {
    return !removedSource.includes(e)
  })

  start[key] = start[key].filter(function(e) {
    return !removedSource.includes(e) && !removed.includes(e)
  })
  var sourceEdges = getEdges(source[key])
  var destEdges = getEdges(dest[key])
  var startEdges = getEdges(start[key])
  var destEdgesDist = destEdges.filter(function(e) {
    return !sourceEdges.includes(e) 
  })

  var destEdgeFinal = []

  var sourceEdgesFinal = []

  for (edge of sourceEdges) {
    var comp = [edge[0], edge[1]]
    var safe = true
    for (aEdge of startEdges) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      sourceEdgesFinal.push(edge)
    }
  }

  for (edge of destEdgesDist) {
    var comp = [edge[1], edge[0]]
    var comp3 = [edge[0], edge[1]]
    var safe = true
    for (aEdge of sourceEdgesFinal) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      destEdgeFinal.push(edge)
    }
  }
  
    var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
  var finalOrder = toposort(graph)
  var finalOrderDistinct = new Map()
  for (elem of finalOrder) {
    if (elem != null && !finalOrderDistinct.has(elem[xmlKey])) {

      finalOrderDistinct.set(elem[xmlKey], elem)
    } 
  }
  var returnList = [...finalOrderDistinct.values()]
  return returnList

}

function handleRelatedLists(sourceLayout, startLayout , destLayout) {
  var key = 'relatedLists'

  var presentAtStart = startLayout.hasOwnProperty(key) 
  var presentAtDest = destLayout.hasOwnProperty(key) 

  if (presentAtStart == false && presentAtDest == false) {
    return sourceLayout
  } else if (presentAtStart == false && presentAtDest == true) {
    //2way merge
    sourceLayout[key] = handleRelatedListItem(sourceLayout[key], [], destLayout[key])
  }else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(sourceLayout[key], startLayout[key])){
      delete sourceLayout[key]
    }
    return sourceLayout
  } else {
    sourceLayout[key] = handleRelatedListItem(sourceLayout[key], startLayout[key], destLayout[key])
  }


  return sourceLayout
}


function handleRelatedListItem(source, start, dest) {

  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKeys2Level(source, 'relatedList', xmlKey)
  var destMap = mapArrayGivenKeys2Level(dest, 'relatedList', xmlKey)
  var startMap = mapArrayGivenKeys2Level(start, 'relatedList', xmlKey)

  var removed = [...startMap.keys()].filter(function(e) {
    return !destMap.has(e)
  })

  var removedSource = [...startMap.keys()].filter(function(e) {
    return !sourceMap.has(e)
  })
  
  var commonKeys;

  if ([...startMap.keys()].length == 0) {
    commonKeys = [...sourceMap.keys()].filter(function(e) {
      return destMap.has(e)
    }) 
  } else {
    commonKeys = [...startMap.keys()].filter(function(e) {
      return sourceMap.has(e) && destMap.has(e)
    })
  }
  

  for (elem of removedSource) {
    if (destMap.has(elem)) {
      destMap.delete(elem)
    }
  }

  for (elem of removed) {
    if (sourceMap.has(elem)) {
      sourceMap.delete(elem)
    }
  }

  for (elem of commonKeys) {
    var changedDuringBranch, differentToDest, changesBetweenStartDest

    changedDuringBranch = !_.isEqual(startMap.get(elem), sourceMap.get(elem));
    differentToDest = !_.isEqual(destMap.get(elem), sourceMap.get(elem));
    changesBetweenStartDest = !_.isEqual(destMap.get(elem), startMap.get(elem));

    if (differentToDest == false) {
      continue;
    } else {
      if (changedDuringBranch == false) {
        sourceMap.set(elem, destElem)
      } else {
        if (changesBetweenStartDest == true) {
          var sourceElem = sourceMap.get(elem)
          var destElem = destMap.get(elem)
          var startElem = startMap.get(elem)

          var arrayKeys = ['customButtons', 'excludeButtons', 'fields']


          for (key in sourceElem) {
            var presentAtStart = startElem.hasOwnProperty(key)
            var presentAtDest = startElem.hasOwnProperty(key)

            if (key == 'relatedList') {
              continue;
            }

            if (presentAtStart == false && presentAtDest == true) {
              if (arrayKeys.includes(key)) {
                //merge the arrays
                sourceElem[key] = mergeOrderedList(sourceElem, {}, destElem, key)

              } 
            } else if ( presentAtStart == true && presentAtDest == false) {
              if (_.isEqual(sourceElem[key], startElem[key])) {
                delete sourceElem[key]
                sourceMap.set(elem, sourceElem)
              } else {
                if (arrayKeys.includes(key)) {

                  if (!Array.isArray(sourceElem[key])) {
                    sourceElem[key] = [sourceElem[key]]
                  }
                  if (!Array.isArray(startElem[key])) {
                    startElem[key] = [startElem[key]]
                  }
                  //Keey only new ones
                  var returnList = []
                  
                  for (elem of sourceElem[key]) {
                    if (!startElem[key].includes(elem)) {
                      returnList.push(elem)
                    }
                  }

                  if (returnList.length == 0) {
                    delete sourceElem[key]
                  } else if (returnList.length == 1) {
                    returnList = returnList[0]
                    sourceElem[key] = returnList
                  } else {
                    sourceElem[key] = returnList
                  }
                  sourceMap.set(elem,sourceElem)

                } 
              }
            } else if (presentAtStart == true && presentAtStart == true) {
              if (arrayKeys.includes(key)) {

                sourceElem[key] = mergeOrderedList(sourceElem, startElem, destElem, key)
                sourceMap.set(elem[xmlKey], sourceElem)
              } else {
                //merge the objects
                changedDuringBranch = !_.isEqual(startElem[key], sourceElem[key]);
                differentToDest = !_.isEqual(destElem[key], sourceElem[key]);
                changesBetweenStartDest = !_.isEqual(destElem[key], startElem[key]);

                if (differentToDest == true) {
                  if (changesBetweenStartDest == true) {
                    if (changedDuringBranch == false) {
                      sourceElem[key] = destElem[key]
                      sourceMap.set(elem,sourceElem)
                    }
                  }
                }
                
              }
            }


            
          }

          
        } else {
          continue;
        }
      }
    }

  }


  var sourceEdges = getEdges([...sourceMap.keys()])
  var destEdges = getEdges([...destMap.keys()])
  var startEdges = getEdges([...startMap.keys()])

  var destEdgeFinal = []

  var sourceEdgesFinal = []

  for (edge of sourceEdges) {
    var comp = [edge[0], edge[1]]
    var safe = true
    for (aEdge of startEdges) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      sourceEdgesFinal.push(edge)
    }
  }

  for (edge of destEdges) {
    var comp = [edge[1], edge[0]]
    var comp3 = [edge[0], edge[1]]
    var safe = true
    for (aEdge of sourceEdgesFinal) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      destEdgeFinal.push(edge)
    }
  }

    var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
  var finalOrder = toposort(graph)

  var finalOrderDistinct = new Map()

  for (elem of finalOrder) {
    if (elem != null && !finalOrderDistinct.has(elem)) {
      finalOrderDistinct.set(elem,elem);
    }
  }

  var returnList = []

  for (elem of [...finalOrderDistinct.keys()]) {
    if (sourceMap.has(elem)) {
      returnList.push(sourceMap.get(elem))
    } else {
      returnList.push(destMap.get(elem))
    }
  }
  

  return returnList

}

function handleRelatedContent(sourceLayout, startLayout, destLayout) {
  var key = 'relatedContent'

  var presentAtStart = startLayout.hasOwnProperty(key) 
  var presentAtDest = destLayout.hasOwnProperty(key) 

  if (presentAtStart == false && presentAtDest == false) {
    return sourceLayout
  } else if (presentAtStart == false && presentAtDest == true) {
    //2way merge
    sourceLayout[key]['relatedContentItems'] = handleRelatedContentItems(sourceLayout[key]['relatedContentItems'], [], destLayout[key]['relatedContentItems'])
  }else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(sourceLayout[key], startLayout[key])){
      delete sourceLayout[key]
    }
    return sourceLayout
  } else {
    sourceLayout[key]['relatedContentItems'] = handleRelatedContentItems(sourceLayout[key]['relatedContentItems'], startLayout[key]['relatedContentItems'], destLayout[key]['relatedContentItems'])
  }

  return sourceLayout
}

function handleRelatedContentItems(source, start, dest) {
  var key = 'layoutItem'

  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapRelatedContentItems(source)
  var startMap = mapRelatedContentItems(start)
  var destMap = mapRelatedContentItems(dest)

  var removed = [...startMap.keys()].filter(function(e) {
    return !destMap.has(e)
  })

  var removedSource = [...startMap.keys()].filter(function(e) {
    return !sourceMap.has(e)
  })
  
  var commonKeys;

  if ([...startMap.keys()].length == 0) {
    commonKeys = [...sourceMap.keys()].filter(function(e) {
      return destMap.has(e)
    }) 
  } else {
    commonKeys = [...startMap.keys()].filter(function(e) {
      return sourceMap.has(e) && destMap.has(e)
    })
  }
  

  for (elem of removedSource) {
    if (destMap.has(elem)) {
      destMap.delete(elem)
    }
  }

  for (elem of removed) {
    if (sourceMap.has(elem)) {
      sourceMap.delete(elem)
    }
  }

  for (elem of commonKeys) {
    var changedDuringBranch, differentToDest, changesBetweenStartDest

    changedDuringBranch = !_.isEqual(startMap.get(elem), sourceMap.get(elem));
    differentToDest = !_.isEqual(destMap.get(elem), sourceMap.get(elem));
    changesBetweenStartDest = !_.isEqual(destMap.get(elem), startMap.get(elem));

    if (differentToDest == false) {
      continue;
    } else {
      if (changedDuringBranch == false) {
        sourceMap.set(elem, destMap.get(elem))
      } else {
        if (changesBetweenStartDest == true) {
          var sourceElem = sourceMap.get(elem)
          var destElem = destMap.get(elem)
          var startElem = startMap.get(elem)

          for (key in sourceElem) {
            changedDuringBranch = !_.isEqual(sourceElem[key], startElem[key])
            differentToDest = !_.isEqual(sourceElem[key], destElem[key])
            changesBetweenStartDest = !_.isElement(startElem[key], destElem[key])
            
            if (differentToDest == false) {
              if (changesBetweenStartDest == true) {
                if (changedDuringBranch == false) {
                  sourceElem[key] = destElem[key]
                  sourceMap.set(elem, sourceElem)
                }
              }
            }
          }

          
        } else {
          continue;
        }
      }
    }

  }

  var sourceEdges = getEdges([...sourceMap.keys()])
  var destEdges = getEdges([...destMap.keys()])
  var startEdges = getEdges([...startMap.keys()])
  var destEdgesDist = destEdges.filter(function(e) {
    return !sourceEdges.includes(e) 
  })

  var destEdgeFinal = []

  var sourceEdgesFinal = []

  for (edge of sourceEdges) {
    var comp = [edge[0], edge[1]]
    var safe = true
    for (aEdge of startEdges) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      sourceEdgesFinal.push(edge)
    }
  }

  for (edge of destEdgesDist) {
    var comp = [edge[1], edge[0]]
    var comp3 = [edge[0], edge[1]]
    var safe = true
    for (aEdge of sourceEdgesFinal) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      destEdgeFinal.push(edge)
    }
  }

    var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
  var finalOrder = toposort(graph)
  var finalOrderDistinct = []

  for (elem of finalOrder) {
    if (!finalOrderDistinct.includes(elem) && elem != null) {
      finalOrderDistinct.push(elem)
    } 
  }

  var returnList = []

  for (elem of finalOrderDistinct) {
    var temp
    if (sourceMap.has(elem)) {
      temp = sourceMap.get(elem)
    } else {
      temp = destMap.get(elem)
    }
    returnList.push(temp)
  }


  if (returnList.length ==1 ) {
    return returnList[0]
  } else {
    return returnList
  }

}

function mapRelatedContentItems(anArray) {
  var returnMap  = new Map()
  for (elem of anArray) {
    if (elem['layoutItem'].hasOwnProperty('component')) {
      returnMap.set(elem['layoutItem']['component'][xmlKey], elem)
    }  else if(elem['layoutItem'].hasOwnProperty('customLink')){
      returnMap.set(elem['layoutItem']['customLink'][xmlKey], elem)
    } else if(elem['layoutItem'].hasOwnProperty('field')) {
      returnMap.set(elem['layoutItem']['field'][xmlKey], elem)
    } else {
      returnMap.set(elem['layoutItem']['page'][xmlKey], elem)
    }
  }

  return returnMap
}

function mapLayoutItems(anArray) {
  var returnMap  = new Map()
  var blankCount = 0
  for (elem of anArray) {
    if (elem.hasOwnProperty('component')) {
      returnMap.set(elem['component'][xmlKey], elem)
    }  else if(elem.hasOwnProperty('customLink')){
      returnMap.set(elem['customLink'][xmlKey], elem)
    } else if(elem.hasOwnProperty('field')) {
      returnMap.set(elem['field'][xmlKey], elem)
    } else if (elem.hasOwnProperty('page')) {
      returnMap.set(elem['page'][xmlKey], elem)
    } else {
      returnMap.set('emptySpace'+blankCount, elem)
    }
  }

  return returnMap
}

function handleQuickActionList(sourceLayout, startLayout, destLayout) {
  var key = 'quickActionList'

  var presentAtStart = startLayout.hasOwnProperty(key) 
  var presentAtDest = destLayout.hasOwnProperty(key) 

  if (presentAtStart == false && presentAtDest == false) {
    return sourceLayout
  } else if (presentAtStart == false && presentAtDest == true) {
    //2way merge
    sourceLayout[key]['quickActionListItems'] = handleQuickActionListItems(sourceLayout[key]['quickActionListItems'], [], destLayout[key]['quickActionListItems'])
  }else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(sourceLayout[key], startLayout[key])){
      delete sourceLayout[key]
    }
  } else {
    if (!_.isEqual(startLayout[key]['quickActionListItems'] , destLayout[key]['quickActionListItems'])) {
      if (_.isEqual(startLayout[key]['quickActionListItems'], sourceLayout[key]['quickActionListItems'])) {
        sourceLayout[key]['quickActionListItems'] = destLayout[key]['quickActionListItems']
      }
    }

    if (!_.isEqual(destLayout[key]['quickActionListItems'], sourceLayout[key]['quickActionListItems'])) {
      sourceLayout[key]['quickActionListItems'] = handleQuickActionListItems(sourceLayout[key]['quickActionListItems'], startLayout[key]['quickActionListItems'], destLayout[key]['quickActionListItems'])
    }
  }

  return sourceLayout
}

function handleQuickActionListItems(source, start, dest) {
  if (!Array.isArray(source)) {
    source = [source]
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKey (source, 'quickActionName')
  var startMap = mapArrayGivenKey (start,'quickActionName')
  var destMap = mapArrayGivenKey (dest,'quickActionName')

  var removed = [...startMap.keys()].filter(function(e) {
    return !destMap.has(e)
  })

  var removedSource = [...startMap.keys()].filter(function(e) {
    return !sourceMap.has(e)
  })

  for (elem of removedSource) {
    if (destMap.has(elem)) {
      destMap.delete(elem)
    }
  }

  for (elem of removed) {
    if (sourceMap.has(elem)) {
      sourceMap.delete(elem)
    }
  }
  
  var sourceEdges = getEdges([...sourceMap.keys()])
  var destEdges = getEdges([...destMap.keys()])
  var startEdges = getEdges([...startMap.keys()])
  var destEdgesDist = destEdges.filter(function(e) {
    return !sourceEdges.includes(e) 
  })

  var destEdgeFinal = []

  var sourceEdgesFinal = []

  for (edge of sourceEdges) {
    var comp = [edge[0], edge[1]]
    var safe = true
    for (aEdge of startEdges) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      sourceEdgesFinal.push(edge)
    }
  }

  for (edge of destEdgesDist) {
    var comp = [edge[1], edge[0]]
    var comp3 = [edge[0], edge[1]]
    var safe = true
    for (aEdge of sourceEdgesFinal) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      destEdgeFinal.push(edge)
    }
  }
    var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
  var finalOrder = toposort(graph)
  var finalOrderDistinct = []

  for (elem of finalOrder) {
    if (!finalOrderDistinct.includes(elem) && elem != null) {
      finalOrderDistinct.push(elem)
    } 
  }

  var returnList = []

  var i = 0;
  for (elem of finalOrderDistinct) {
    var temp
    if (sourceMap.has(elem)) {
      temp = sourceMap.get(elem)
    } else {
      temp = destMap.get(elem)
    }

    temp['sortOrder'][xmlKey] = i
    i+=1
    returnList.push(temp)
  }

  if (returnList.length == 1) {
    return returnList[0]
  } else {
    return returnList
  }
}

function handlePlatformActionList(sourceLayout, startLayout, destLayout, key) {
  var presentAtStart = startLayout.hasOwnProperty(key) 
  var presentAtDest = destLayout.hasOwnProperty(key) 

  if (presentAtStart == false && presentAtDest == false) {
    return sourceLayout
  } else if (presentAtStart == false && presentAtDest == true) {
    //2way merge
    sourceLayout[key]['platformActionListItems'] = handlePlatformActionListItems(sourceLayout[key]['platformActionListItems'], [], destLayout[key]['platformActionListItems'])
  }else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(sourceLayout[key], startLayout[key])){
      delete sourceLayout[key]
    }
  } else {
    if (!_.isEqual(startLayout[key]['actionListContext'] , destLayout[key]['actionListContext'])) {
      if (_.isEqual(startLayout[key]['actionListContext'], sourceLayout[key]['actionListContext'])) {
        sourceLayout[key]['actionListContext'] = destLayout[key]['actionListContext']
      }
    }

    if (!_.isEqual(destLayout[key]['platformActionListItems'], sourceLayout[key]['platformActionListItems'])) {
      sourceLayout[key]['platformActionListItems'] = handlePlatformActionListItems(sourceLayout[key]['platformActionListItems'], startLayout[key]['platformActionListItems'], destLayout[key]['platformActionListItems'])
    }
  }

  return sourceLayout
}

function handlePlatformActionListItems(source,start,dest) {

  if (!Array.isArray(source)) {
    source = [source]
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGiven2Keys (source, 'actionName' , 'actionType')
  var startMap = mapArrayGiven2Keys (start,'actionName' , 'actionType')
  var destMap = mapArrayGiven2Keys (dest,'actionName' , 'actionType')

  var removed = [...startMap.keys()].filter(function(e) {
    return !destMap.has(e)
  })

  var removedSource = [...startMap.keys()].filter(function(e) {
    return !sourceMap.has(e)
  })

  for (elem of removedSource) {
    if (destMap.has(elem)) {
      destMap.delete(elem)
    }
  }


  for (elem of removed) {
    if (sourceMap.has(elem)) {
      sourceMap.delete(elem)
    }
  }
  
  var sourceEdges = getEdges([...sourceMap.keys()])
  var destEdges = getEdges([...destMap.keys()])
  var startEdges = getEdges([...startMap.keys()])
  var destEdgesDist = destEdges.filter(function(e) {
    return !sourceEdges.includes(e) 
  })

  var destEdgeFinal = []

  var sourceEdgesFinal = []

  for (edge of sourceEdges) {
    var comp = [edge[0], edge[1]]
    var safe = true
    for (aEdge of startEdges) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      sourceEdgesFinal.push(edge)
    }
  }

  for (edge of destEdgesDist) {
    var comp = [edge[1], edge[0]]
    var comp3 = [edge[0], edge[1]]
    var safe = true
    for (aEdge of sourceEdgesFinal) {
      var comp2 = [aEdge[0], aEdge[1]]
      if (_.isEqual(comp,comp2) || _.isEqual(comp3,comp2)) {
        safe = false
      }
    }

    if (safe == true) {
      destEdgeFinal.push(edge)
    }
  }


  

    var graph = [].concat(sourceEdgesFinal).concat(destEdgeFinal)
  graph = cleanGraph(graph) 
  
  

  var finalOrder = toposort(graph)
  var finalOrderDistinct = []

  for (elem of finalOrder) {
    if (!finalOrderDistinct.includes(elem) && elem != null) {
      finalOrderDistinct.push(elem)
    } 
  }

  var returnList = []

  var i = 0;
  for (elem of finalOrderDistinct) {
    var temp
    if (sourceMap.has(elem)) {
      temp = sourceMap.get(elem)
    } else {
      temp = destMap.get(elem)
    }

    temp['sortOrder'][xmlKey] = i
    i+=1
    returnList.push(temp)
  }

  if (returnList.length == 1) {
    return returnList[0]
  } else {
    return returnList
  }
}

var specialKeysFeedLayout = ['feedFilters', 'leftComponents', 'rightComponents']

function cleanGraph(graph) {
  var elems = []
  var toDelete = []
  for (elem of graph) {
    elems.push(elem[0])

    if (elems.includes(elem[1])) {
      toDelete.push(elem)
    }

  }

  return graph.filter(function(e){
    return !toDelete.includes(e);
  })
}

function handleFeedLayout(sourceLayout, startLayout, destLayout, key) {
  var presentAtStart = startLayout.hasOwnProperty(key) 
  var presentAtDest = destLayout.hasOwnProperty(key) 

  if (presentAtStart == false && presentAtDest == false) {
    return sourceLayout
  } else if (presentAtStart == false && presentAtDest == true) {
    //2way merge
    sourceLayout[key] = mergeFeedLayout(sourceLayout[key], {}, destLayout[key])
  }else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(sourceLayout[key], startLayout[key])){
      delete sourceLayout[key]
    }
  } else {
    sourceLayout[key] = mergeFeedLayout(sourceLayout[key], startLayout[key], destLayout[key])
  }

  return sourceLayout
}


function mergeFeedLayout(source,start,dest) {
  keysToDelete = []
  var presentAtStart,presentAtDest,changedDuringBranch,changesBetweenStartDest, differentToDest
  for (key in source) {
    if(!specialKeysFeedLayout.includes(key)) {
      presentAtStart = start.hasOwnProperty(key) 
      presentAtDest = dest.hasOwnProperty(key) 

      if (presentAtStart == true && presentAtDest == false) {
        changedDuringBranch = !_.isEqual(start[key], source[k]);

        if (changedDuringBranch == false) {
          keysToDelete.push(key)
        }
      } else if (presentAtStart == true && presentAtDest == true){
        changedDuringBranch = !_.isEqual(start[key], source[k]);
        differentToDest = !_.isEqual(dest[key], source[k]);

        if (differentToDest == true ) {
          if (changedDuringBranch == false) {
            source[key] = dest[key]
          
          } 
        } 
      }


    }
  }

  for (key of keysToDelete) {
    delete source[key]
  }


  //if !changeduring branch just copy it - check if present first 
  var key = 'feedFilters'
  var typeMatch
  presentAtStart = start.hasOwnProperty(key) 
  presentAtDest = dest.hasOwnProperty(key) 
  
  if (presentAtStart == false && presentAtDest == true) {
    typeMatch = findType(source[key]) == findType(dest[key])
    differentToDest = !_.isEqual(dest[key], source[k]);
    
    if (differentToDest == true) {

      if (typeMatch == false ) {
        if (findType(source[key]) != 'array') {
          source[key] = [source[key]]
        } else {
          dest[key] = [dest[key]]
        }
      } 

      if (Array.isArray(source[key])) {
          var sourceMap = feedFiltersMap(source[key])
          var destMap = feedFiltersMap(dest[key])
          var keysOnlyInDest = [...destMap.keys()].filter(function(e) {
            return !sourceMap.has(e)
          })
          
          for (elem of keysOnlyInDest) {
            sourceMap.set(elem, destMap.get(elem))
          }

          source[key] = [...sourceMap.values()]
      } else {
          source[key] = [dest[key], source[key]]
      }
    }

  } else if (presentAtStart == true && presentAtDest == false) {
    changedDuringBranch == !_.isEqual(source[key], start[key])
    if (changedDuringBranch == false) {
      delete source[key]
    } 
  } else if (presentAtStart == true && presentAtDest == true) {
      source = handleFeedFilters(source, start, dest, key)
  }

  key = 'rightComponents'

  if (source.hasOwnProperty(key)) {
    source = handleFeedLayoutComponent(source, start, dest , key)
  } else if (dest.hasOwnProperty(key)) {
    if (!start.hasOwnProperty(key)) {
      source[key] = dest[key]
    } 
  }

  key = 'leftComponents'

  if (source.hasOwnProperty(key)) {
    source = handleFeedLayoutComponent(source, start, dest , key)
  } else if (dest.hasOwnProperty(key)) {
    if (!start.hasOwnProperty(key)) {
      source[key] = dest[key]
    } 
  }

  return source

}

function mapArrayGivenKey(anArray, key) {
  var resultMap = new Map();

  for (elem of anArray) {
    resultMap.set(elem[key], elem)
  }

  return resultMap
}

function mapArrayGiven2Keys(anArray, key,key2) {
  var resultMap = new Map();
  for (elem of anArray) {
   

    resultMap.set(elem[key][xmlKey] + '-'+ elem[key2][xmlKey], elem)
  }

  return resultMap
}

function mapArrayGivenKeys2Level(anArray, key,key2) {
  var resultMap = new Map();
  for (elem of anArray) {
    if (key2 != xmlKey) {
      resultMap.set(elem[key][key2][xmlKey] , elem)
    } else {
      resultMap.set(elem[key][key2] , elem)

    }
  }

  return resultMap
}

function handleFeedLayoutComponent(source, start, dest, key) {
  var presentAtStart = start.hasOwnProperty(key) 
  var presentAtDest = dest.hasOwnProperty(key) 
  var typeMatch, sourceMap,destMap,startMap

  if (presentAtStart == false && presentAtDest == true) {
    typeMatch = findType(source[key]) == findType(dest[key])

    if (typeMatch == false) {
      if (Array.isArray(source[key])) {
        dest[key] = [dest[key]]
      } else {
        source[key] = [source[key]]
      }
    }

    if (Array.isArray(source[key])) {
      sourceMap = mapArrayGivenKey(source[key], 'componentType')
      destMap = mapArrayGivenKey(dest[key], 'componentType')
      
      for (let [k,v] of destMap) {
        if (!sourceMap.has(k)) {
          sourceMap.set(k,v)
        }
      }
      source[key] = [...sourceMap.keys()]
      if (source[key].length ==1) {
        source[key] = source[key][0]
      }
    } else {
      if (!_.isEqual(source[key], dest[Key])) {
        source[key] = [dest[key], source[key]]
      }
    }
  }  else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(source[key], start[Key])) {
      delete source[key]
    }
  } else if (presentAtStart == true && presentAtDest == true) {
   
    if (!Array.isArray(source[key])) {
      source[key] = [source[key]]
    }

    if (!Array.isArray(start[key])) {
      start[key] = [start[key]]
    }

    if (!Array.isArray(dest[key])) {
      dest[key] = [dest[key]]
    }

    sourceMap = mapArrayGivenKey(source[key], 'componentType')
    destMap = mapArrayGivenKey(dest[key], 'componentType')
    startMap = mapArrayGivenKey(start[key], 'componentType')
    var keysRemove = [...startMap.keys()].filter(function(e) {
      return !destMap.has(e)
    })

    var newKeysDest = [...destMap.keys()].filter(function(e) {
      return !start.has(e) && !sourceMap.has(e)
    })

    for (elem of keysRemove) {
      if (sourceMap.has(elem)) {
        sourceMap.delete(elem)
      }
    }

    for (elem of newKeysDest) {
      sourceMap.set(elem, destMap.get(elem))
    }

    source[key] = [...sourceMap.values()]

    if (source[key].length == 1 ) {
      source[key] = source[key][0]
    }

  }

  return source;

}

function handleFeedFilters(source, start, dest, key) {
  
  if (!Array.isArray(source[key])) {
    source[key] = [source[key]]
  }

  if (!Array.isArray(start[key])) {
    start[key] = [start[key]]
  }

  if (!Array.isArray(dest[key])) {
    dest[key] = [dest[key]]
  }

  var sourceMap = feedFiltersMap(source[key])
  var startMap = feedFiltersMap(start[key])
  var destMap = feedFiltersMap(dest[key])

  var keysRemovedAtDest = [...startMap.keys()].filter(function(e) {
    return !destMap.has(e)
  })


  var removedSource = [...startMap.keys()].filter(function(e) {
    return !sourceMap.has(e)
  })

  for (elem of removedSource) {
    if (destMap.has(elem)) {
      destMap.delete(elem)
    }
  }

  var keysOnlyIndest= [...destMap.keys()].filter(function(e) {
    return !startMap.has(e) && !sourceMap.has(elem)
  })

  for (elem of keysRemovedAtDest) {
    if (sourceMap.has(elem)) {
      sourceMap.delete(elem)
    }
  }

  for (elem of keysOnlyIndest) {
    sourceMap.set(elem, destMap.get(elem))
  }

  source[key] = [...sourceMap.values()]

  return source
}

function feedFiltersMap(anArray) {
  var returnMap = new Map()
  for (elem of anArray) {
    if (elem.hasOwnProperty('feedItemType')) {
      returnMap.set(elem['feedItemType'], elem)
    } else {
      returnMap.set('AllUpdates', elem) 
    }
  }
  return returnMap
}


function topHandleButtons(sourceLayout, startLayout ,destLayout, currentKey) {
  var presentAtStart = startLayout.hasOwnProperty(currentKey) 
  var presentAtDest = destLayout.hasOwnProperty(currentKey) 

  if (presentAtStart == false && presentAtDest == false) {
    return sourceLayout
  } else if (presentAtStart == false && presentAtDest == true) {
      //Both added element 

      var sourceType = findType(sourceLayout[currentKey])
      var destType = findType(destLayout[currentKey])
      var typeMatch = sourceType == destType

      if (typeMatch == true) {
        if (sourceType != 'array') {
          sourceLayout[currentKey] = [sourceLayout[currentKey]]
          destLayout[currentKey] = [destLayout[currentKey]]
        }

      } else {
        if (sourceType != 'array') {
          sourceLayout[currentKey] = [sourceLayout[currentKey]]
        } else {
          destLayout[currentKey] = [destLayout[currentKey]]
        }
      }

      var returnArray = []

      var sourceMap = mapfromArray(sourceLayout[currentKey],false)
      var destMap = mapfromArray(destLayout[currentKey], false)
      for (var button of sourceLayout[currentKey]) {
        if (!destMap.has(button[xmlKey])) {
          returnArray.push(button)
        }

      }

      sourceLayout[currentKey] = destLayout[currentKey].concat(returnArray)
  } else if (presentAtStart == true && presentAtDest == false) {
    //Removed at dest - if we've added something different to the element itself we shouold keep otherwise discard as well  - Done
    var sourceType = findType(sourceLayout[currentKey])
    var startType = findType(startLayout[currentKey])
    var typeMatch = sourceType == startType
    

    if (_.isEqual(startLayout[currentKey],sourceLayout[currentKey])) {

      delete sourceLayout[currentKey]
    } else {
      var returnArray = []

      // make sure they're both arrays so all comparisons done at once
      if (typeMatch == true) {
        if (sourceType != 'array') {
          sourceLayout[currentKey] = [sourceLayout[currentKey]]
          startLayout[currentKey] = [startLayout[currentKey]]
        }

      } else {
        if (sourceType != 'array') {
          sourceLayout[currentKey] = [sourceLayout[currentKey]]
        } else {
          startLayout[currentKey] = [startLayout[currentKey]]
        }
      }

      var sourceMap = mapfromArray(sourceLayout[currentKey],false)
      var startMap = mapfromArray(startLayout[currentKey], false)
      for (var button of sourceLayout[currentKey]) {
        if (!startMap.has(button[xmlKey])) {
          returnArray.push(button)
        }

      }
      
      if (returnArray.length == 0) {
        delete sourceLayout[currentKey]
      } else if (returnArray.length == 1){
        sourceLayout[currentKey] = returnArray[0]
      } else {
        sourceLayout[currentKey] = returnArray
      }

    }

    
  } else  {
    sourceLayout[currentKey] = handleCustomButtons(sourceLayout[currentKey], startLayout[currentKey], destLayout[currentKey]);
  
  }

  return sourceLayout

}

function getEdges(anArray) {
  var returnArray = [[null,anArray[0]]]

  for (var i =0; i < anArray.length - 1 ;i++ ) {
    var currEdge = [anArray[i],anArray[i+1]]
    returnArray.push(currEdge)
  }

  return returnArray

}

function returnMatches(anArray, refArray) {
  var returnArray = []
  for (el of anArray) {
    if(refArray.includes(el[xmlKey])) {
      returnArray.push(el)
    }
  }

  return returnArray
}

function handleCustomButtons(sourceButtons, startButtons, destButtons) {
  var startType = findType(startButtons)
  var sourceType = findType(sourceButtons)
  var destType = findType(destButtons)
  if (sourceType != 'array') {
    sourceButtons = [sourceButtons]
  }

  if (destType != 'array') {
    destButtons = [destButtons]
  }

  if (startType != 'array') {
    startButtons = [startButtons]
  }
  var sourceMap = mapfromArray(sourceButtons, false)
  var destMap = mapfromArray(destButtons, false)
  var startMap = mapfromArray(startButtons, false)

  var onlyInDestMap = [...destMap.keys()].filter(function(e){
    return (!sourceMap.has(e) && !startMap.has(e))
  })

  var onlyInSourceMap = [...sourceMap.keys()].filter(function(e){
    return (!destMap.has(e) && !startMap.has(e))
  })

  var commonKeys = [...sourceMap.keys()].filter(function(e){
    return (destMap.has(e) && startMap.has(e))
  }) 

  var keysToDelete = []
  //Handle deletions so we can order things better
  for (let[k,v] of startMap) {
    var didDelete = false

    if (!destMap.has(k) || !sourceMap.has(k)) {
      keysToDelete.push(k)
    }

  }

  //Filter out deleted keys from source 
  sourceButtons = sourceButtons.filter(function(e){
    return !keysToDelete.includes(e[xmlKey])
  })

  destButtons = destButtons.filter(function(e) {
    return !keysToDelete.includes(e[xmlKey])
  })

  //Set start to be the same order as dest without the new keys
  startButtons = destButtons.filter(function(e){
    return !keysToDelete.includes(e[xmlKey]) && !onlyInDestMap.includes(e[xmlKey])
  })

  keysToDelete = []

  var sourceEdges = getEdges(sourceButtons)
  var destEdges = getEdges(destButtons)
  var startEdges = getEdges(startButtons)

  for (var edge of sourceEdges) {
    
    for (var i =0; i < destEdges.length; i++) {
      if (_.isEqual(edge, destEdges[i])) {
        keysToDelete.push(destEdges[i])
      }
    }

    destEdges = destEdges.filter(function(e){
      return !keysToDelete.includes(e)
    })

    keysToDelete = []

    for (var i =0; i < startEdges.length; i++) {
      if (_.isEqual(edge, startEdges[i])) {
        keysToDelete.push(startEdges[i])
      }
    }

    startEdges = startEdges.filter(function(e){
      return !keysToDelete.includes(e)
    })
  }

  keysToDelete = []

  for (var edge of destEdges) {
    for (var i =0; i < startEdges.length; i++) {
      if (_.isEqual(edge, startEdges[i]) && edge[0] != null) {
        keysToDelete.push(edge)
      }
    }

   
  }

  destEdges = destEdges.filter(function(e){
    return !keysToDelete.includes(e)
  })
  
  var allKeys = [...onlyInSourceMap].concat([...onlyInDestMap]).concat(commonKeys);
  var allKeysSet = [... new Set(allKeys)]
  var overallOrder =  [].concat(sourceEdges).concat(destEdges)

  var beg = null
  for (var i = 0; i < overallOrder.length; i++) {
    if (beg == null) {
      if (overallOrder[i][0] == null) {
        beg = overallOrder[i][1]
      }
    } else {
      if (overallOrder[i][1] == beg && overallOrder[i][0] != null) {
        keysToDelete.push(overallOrder[i])
      }
    }
  }

  overallOrder = overallOrder.filter(function(e){
    return !keysToDelete.includes(e)
  })

  var resultOrder = toposort(overallOrder,allKeysSet)
  var cleanResult = [];
  var cleanResultKeys = []
  for (elem of resultOrder) {
    if (elem != null && !cleanResultKeys.includes(elem[xmlKey])  ) {
      cleanResult.push(elem)
      cleanResultKeys.push(elem[xmlKey])
    } 
  }

  if (cleanResult.length == 0 ) {
    return cleanResult[0]
  }
  return cleanResult
}

function findType(obj) {
  if (obj.hasOwnProperty(xmlKey)) {
    return 'element'
  } else if (Array.isArray(obj)) {
    return 'array'
  } else {
    return 'object'
  }
}

function buildMerge(source, start, dest) {
    //for mandatory keys - we need to merge in any differences that are found between destMaster
    var sourceObject = source['CustomObject']
  

    var startObject = start['CustomObject']
    var destObject = dest['CustomObject']
    newKeysInDest = findNewKeys(sourceObject, destObject)
    newKeysInSource = findNewKeys(destObject, sourceObject)
  
    sourceObject = addNewKeys(sourceObject, destObject, newKeysInDest)
    //No stripping or anything fancy if its a custom setting, just return object as is
    if (sourceObject.hasOwnProperty('customSettingsType')) {
      return source
    }
  
    for (mandKey of mandatory) {
      if (sourceObject[mandKey]) {
  
        var changedDuringBranch = !_.isEqual(startObject[mandKey], sourceObject[mandKey])
        var changesBetweenStartDest  = !_.isEqual(destObject[mandKey], startObject[mandKey])
        var differentToDest = !_.isEqual(destObject[mandKey], sourceObject[mandKey])
  
        if (changesBetweenStartDest != false && differentToDest != false) {
          if (changedDuringBranch == false) {
            sourceObject[mandKey] = destObject[mandKey]
          } else {
            sourceObject[mandKey] = mergeMandatory(sourceObject[mandKey], startObject[mandKey], destObject[mandKey])
          }
  
        }
      } 
    }
  
    var presentKeys = []
  
    for (regKey in sourceObject){
      if (!mandatory.includes(regKey) ) {
        presentKeys.push(regKey)
      }
    }
  
    var doneFields =[]
    var keysToDelete = []

    for (regKey of presentKeys) {
   
      if (!doneFields.includes(regKey)) {

  
        if (regKey == 'fields') {
          sourceObject['fields'] = handleFields(sourceObject['fields'], startObject['fields'], destObject['fields'],passDoDelete)
          doneFields.push('fields')
          continue;
        }

        var presentAtStart = startObject.hasOwnProperty(regKey);
        var presentAtDest = destObject.hasOwnProperty(regKey);
        var changedDuringBranch = !_.isEqual(startObject[regKey], sourceObject[regKey])
        var changesBetweenStartDest  = !_.isEqual(destObject[regKey], startObject[regKey])
        var differentToDest = !_.isEqual(destObject[regKey], sourceObject[regKey])
        
        if (presentAtStart == false && presentAtDest == false) {
          continue;
        } else if (presentAtStart == false && presentAtDest == true) {
          if (differentToDest == true ) {
            // 2 way merge? 
          }
        } else if (presentAtStart == true && presentAtDest == false) {
            if (changedDuringBranch == false) {
              keysToDelete.push(regKey)
            }
        } else {

          if (differentToDest == true) {
            if (changedDuringBranch == true) {
              try {
              sourceObject = mergeElementHandler(sourceObject, startObject, destObject, regKey);

              } catch (err) {
                console.log('Could not merge ' + regKey)
                console.log(err)
                return source            
              }

            } else {
              if (changesBetweenStartDest == true) {
                sourceObject[regKey] = destObject[regKey]
              }
            }
          }

          
        }
  
        // sourceObject[regKey] = mergeElement(sourceObject[regKey], startObject[regKey], destObject[regKey], passDoDelete)
      }
    }
    source['CustomObject'] = sourceObject  
  
    return source
    
}

function mergeListObj(source,start,dest) {
  
  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKey(source,'fullName')
  var startMap = mapArrayGivenKey(start, 'fullName')
  var destMap = mapArrayGivenKey(dest, 'fullName')

  var keysInDestOnly = [...destMap.keys()].filter(function(e){
    return !sourceMap.has(key) & !startMap.has(e)
  })

  var keysRemoveInDest =  [...startMap.keys()].filter(function(e){
    return !destMap.has(key)
  })

  var commonKeys = [...sourceMap.keys()].filter(function(e){
    return destMap.has(e)
  })

  for (key of keysRemoveInDest) {
    if (_.isEqual(sourceMap.get(key), startMap.get(key))) {
      sourceMap.delete(key)
      
    }
  }

  for (key of keysInDestOnly) {
    sourceMap.set(key, destMap.get(key))
  }

  for (key of commonKeys) {
    if (startMap.has(key)) {
      
      var sourceObj = sourceMap.get(key)
      var startObj = startMap.get(key)
      var destObj = destMap.get(key)

      if (!_.isEqual(sourceObj, destObj)) {
        for (element in sourceObj) {
          var presentAtStart = startObj.hasOwnProperty(element)
          var presentAtDest = destObj.hasOwnProperty(element)

          if (presentAtStart == true && presentAtDest == false) {
            if (_.isEqual(sourceObj[element], startObj[element])) {
              delete sourceObj[element]
            }
          } else if (presentAtStart == true && presentAtDest == true) {
           
            if (_.isEqual(sourceObj[element], startObj[element])) {
              sourceObj[element] = destObj[element]
            }

          }

        }

        sourceMap.set(key, sourceObj)
      }
    } 
  }

  var finalKeys = [...sourceMap.keys()].sort()
  var returnList = []

  for (key of finalKeys) {
    returnList.push(sourceMap.get(key))
  }

  if (returnList.length == 1) {
    returnList = returnList[0]
  }

  return returnList;
}

function mergeRecordTypes(source,start,dest) {
  
  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKey(source,'fullName')
  var startMap = mapArrayGivenKey(start, 'fullName')
  var destMap = mapArrayGivenKey(dest, 'fullName')

  var keysInDestOnly = [...destMap.keys()].filter(function(e){
    return !sourceMap.has(key) & !startMap.has(e)
  })

  var keysRemoveInDest =  [...startMap.keys()].filter(function(e){
    return !destMap.has(key)
  })

  var commonKeys = [...sourceMap.keys()].filter(function(e){
    return destMap.has(e)
  })

  for (key of keysRemoveInDest) {
    if (_.isEqual(sourceMap.get(key), startMap.get(key))) {
      sourceMap.delete(key)
      
    }
  }

  for (key of keysInDestOnly) {
    sourceMap.set(key, destMap.get(key))
  }

  for (key of commonKeys) {
    if (startMap.has(key)) {
      
      var sourceProcess = sourceMap.get(key)
      var startProcess = startMap.get(key)
      var destProcess = destMap.get(key)

      if (!_.isEqual(sourceProcess, destProcess)) {
        for (element in sourceProcess) {
          var presentAtStart = startProcess.hasOwnProperty(element)
          var presentAtDest = destProcess.hasOwnProperty(element)

          if (presentAtStart == true && presentAtDest == false) {
            if (_.isEqual(sourceProcess[element], startProcess[element])) {
              delete sourceProcess[element]
            }
          } else if (presentAtStart == true && presentAtDest == true) {
            

            if (element == 'picklistValues') {
              
              if (!Array.isArray(sourceProcess[element])) {
                sourceProcess[element] = [sourceProcess[element]]
              }
            
              if (!Array.isArray(startProcess[element])) {
                startProcess[element] = [startProcess[element]]
              }
            
              if (!Array.isArray(destProcess[element])) {
                destProcess[element] = [destProcess[element]]
              }

              var valueSourceMap = mapArrayGivenKey(sourceProcess[element], 'picklist')
              var valuestartMap = mapArrayGivenKey(startProcess[element], 'picklist')
              var valuedestMap = mapArrayGivenKey(destProcess[element], 'picklist')

              var keysInDestOnlyVal = [...valuedestMap.keys()].filter(function(e){
                return !valueSourceMap.has(key)
              })
            
              var keysRemoveInDestVal =  [...valuestartMap.keys()].filter(function(e){
                return !valuedestMap.has(key)
              })
            
              var commonValKeys = [...valueSourceMap.keys()].filter(function(e){
                return valuedestMap.has(e) && valuestartMap.has(e)
              })
            
              for (valKey of keysRemoveInDestVal) {
                if (_.isEqual(valueSourceMap.get(valKey), valuestartMap.get(valKey))) {
                  sourceMap.delete(key)
                  
                }
              }

              for (valKey of commonValKeys) {
                if (!_.isEqual(valueSourceMap.get(valKey), valuedestMap.get(valKey))) {
                  var sourceVal = valueSourceMap.get(valKey)
                  var destVal = valuedestMap.get(valKey)
                  var startVal = valueSourceMap.get(valKey)

                  sourceVal = mergePickListValues(sourceVal, startVal, destVal)

                  valueSourceMap.set(valKey, sourceVal)

                }

              }

              sourceProcess[element] = [...valueSourceMap.values()]

              var returnValues = []
              
              for (k of [...sourceMap.keys()]) {
                returnValues.push(k)
              }

              for (k of keysInDestOnlyVal) {
                returnValues.push(destMap.get(k))
              }

              if (returnValues.length == 1) {
                returnValues = returnValues[0]
              }

              sourceProcess[element] = returnValues


            } else {
              if (_.isEqual(sourceProcess[element], startProcess[element])) {
                sourceProcess[element] = destProcess[element]
              }
            }

          }

        }

        sourceMap.set(key, sourceProcess)
      }
    } 
  }

  var finalKeys = [...sourceMap.keys()].sort()
  var returnList = []

  for (key of finalKeys) {
    returnList.push(sourceMap.get(key))
  }

  if (returnList.length == 1) {
    returnList = returnList[0]
  }

  return returnList;
}

function mergePickListValues (source, start, dest) {
  var k = 'values'


  if (start == null) {

    if (!Array.isArray(source[k])) {
      source[k] = [source[k]]
    }

    if (!Array.isArray(source[k])) {
      dest[k] = [dest[k]]
    }

    var sourceMap = mapArrayGivenKey(source[k],'fullName')
    var destMap = mapArrayGivenKey(dest[k], 'fullName')
    
    var keysInDestOnly = [...destMap.keys()].filter(function(e){
      return !sourceMap.has(key) & !startMap.has(e)
    })

    for (key of keysInDestOnly) {
      sourceMap.set(key, destMap.get(key))
    }

    return [...sourceMap.values()].sort()

  } else {
    if (_.isEqual(source,start)) {
      return dest
    } else {
      
      if (!Array.isArray(source[k])) {
        source[k] = [source[k]]
      }

      if (!Array.isArray(start[k])) {
        start[k] = [start[k]]
      }

      if (!Array.isArray(source[k])) {
        dest[k] = [dest[k]]
      }

      var sourceMap = mapArrayGivenKey(source[k],'fullName')
      var startMap = mapArrayGivenKey(start[k], 'fullName')
      var destMap = mapArrayGivenKey(dest[k], 'fullName')
    
      var keysInDestOnly = [...destMap.keys()].filter(function(e){
        return !sourceMap.has(key) & !startMap.has(e)
      })
    
      var keysRemoveInDest =  [...startMap.keys()].filter(function(e){
        return !destMap.has(key)
      })
    
      var commonKeys = [...sourceMap.keys()].filter(function(e){
        return destMap.has(e)
      })
    
      for (key of keysRemoveInDest) {
        if (_.isEqual(sourceMap.get(key), startMap.get(key))) {
          sourceMap.delete(key)
          
        }
      }
    
      for (key of keysInDestOnly) {
        sourceMap.set(key, destMap.get(key))
      }

      for (key of commonKeys) {
        if (!_.isEqual(sourceMap.get(key), destMap.get(key))) {
          if (_.isEqual(sourceMap.get(key), startmap.get(key))) {
            sourceMap.set(key, destMap.get(key))
          }
        }
      }


    }
  }
   
  return [...sourceMap.values()].sort()
}

function mergeBusinessProcess(source,start,dest) {
  
  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKey(source,'fullName')
  var startMap = mapArrayGivenKey(start, 'fullName')
  var destMap = mapArrayGivenKey(dest, 'fullName')

  var keysInDestOnly = [...destMap.keys()].filter(function(e){
    return !sourceMap.has(key) & !startMap.has(e)
  })

  var keysRemoveInDest =  [...startMap.keys()].filter(function(e){
    return !destMap.has(key)
  })

  var commonKeys = [...sourceMap.keys()].filter(function(e){
    return destMap.has(e)
  })

  for (key of keysRemoveInDest) {
    if (_.isEqual(sourceMap.get(key), startMap.get(key))) {
      sourceMap.delete(key)
      
    }
  }

  for (key of keysInDestOnly) {
    sourceMap.set(key, destMap.get(key))
  }

  for (key of commonKeys) {
    if (startMap.has(key)) {
      
      var sourceProcess = sourceMap.get(key)
      var startProcess = startMap.get(key)
      var destProcess = destMap.get(key)

      if (!_.isEqual(sourceProcess, destProcess)) {
        for (element in sourceProcess) {
          var presentAtStart = startProcess.hasOwnProperty(element)
          var presentAtDest = destProcess.hasOwnProperty(element)

          if (presentAtStart == true && presentAtDest == false) {
            if (_.isEqual(sourceProcess[element], startProcess[element])) {
              delete sourceProcess[element]
            }
          } else if (presentAtStart == true && presentAtDest == true) {
            

            if (element == 'values') {
              
              if (!Array.isArray(sourceProcess[element])) {
                sourceProcess[element] = [sourceProcess[element]]
              }
            
              if (!Array.isArray(startProcess[element])) {
                startProcess[element] = [startProcess[element]]
              }
            
              if (!Array.isArray(destProcess[element])) {
                destProcess[element] = [destProcess[element]]
              }

              var valueSourceMap = mapArrayGivenKey(sourceProcess[element], 'fullName')
              var valuestartMap = mapArrayGivenKey(startProcess[element], 'fullName')
              var valuedestMap = mapArrayGivenKey(destProcess[element], 'fullName')

              var keysInDestOnlyVal = [...valuedestMap.keys()].filter(function(e){
                return !valueSourceMap.has(key)
              })
            
              var keysRemoveInDestVal =  [...valuestartMap.keys()].filter(function(e){
                return !valuedestMap.has(key)
              })
            
              var commonValKeys = [...valueSourceMap.keys()].filter(function(e){
                return valuedestMap.has(e) && valuestartMap.has(e)
              })
            
              for (valKey of keysRemoveInDestVal) {
                if (_.isEqual(valueSourceMap.get(valKey), valuestartMap.get(valKey))) {
                  sourceMap.delete(key)
                  
                }
              }

              for (valKey of commonValKeys) {
                if (!_.isEqual(valueSourceMap.get(valKey), valuedestMap.get(valKey))) {
                  var sourceVal = valueSourceMap.get(valKey)
                  var destVal = valuedestMap.get(valKey)
                  var startVal = valueSourceMap.get(valKey)

                  for (elem in sourceVal) {

                    if (!_.isEqual(sourceVal[elem], destVal[elem])) {

                      if (_.isEqual(sourceVal[elem], startVal[elem])) {
                        sourceVal[elem] = destVal[eleme]
                      }

                    }

                  }

                  valueSourceMap.set(valKey, sourceVal)

                }

              }

              sourceProcess[element] = [...valueSourceMap.values()]

              var returnValues = []
              
              for (k of [...sourceMap.keys()]) {
                returnValues.push(k)
              }

              for (k of keysInDestOnlyVal) {
                returnValues.push(destMap.get(k))
              }

              if (returnValues.length == 1) {
                returnValues = returnValues[0]
              }

              sourceProcess[element] = returnValues


            } else {
              if (_.isEqual(sourceProcess[element], startProcess[element])) {
                sourceProcess[element] = destProcess[element]
              }
            }

          }

        }

        sourceMap.set(key, sourceProcess)
      }
    } 
  }

  var finalKeys = [...sourceMap.keys()].sort()
  var returnList = []

  for (key of finalKeys) {
    returnList.push(sourceMap.get(key))
  }

  if (returnList.length == 1) {
    returnList = returnList[0]
  }

  return returnList;
}

function mergeCompactLayouts(source,start,dest) {

  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKey(source,'fullName')
  var startMap = mapArrayGivenKey(start, 'fullName')
  var destMap = mapArrayGivenKey(dest, 'fullName')

  var keysInDestOnly = [...destMap.keys()].filter(function(e){
    return !sourceMap.has(key) & !startMap.has(e)
  })

  var keysRemoveInDest =  [...startMap.keys()].filter(function(e){
    return !destMap.has(key)
  })

  var commonKeys = [...sourceMap.keys()].filter(function(e){
    return destMap.has(e)
  })

  for (key of keysRemoveInDest) {
    if (_.isEqual(sourceMap.get(key), startMap.get(key))) {
      sourceMap.delete(key)
      
    }
  }

  for (key of keysInDestOnly) {
    sourceMap.set(key, destMap.get(key))
  }

  for (key of commonKeys) {
    if (startMap.has(key)) {
      
      var sourceLayout = sourceMap.get(key)
      var startLayout = startMap.get(key)
      var destLayout = destMap.get(key)

      if (!_.isEqual(sourceLayout, destLayout)) {
        if (!_.isEqual(sourceLayout['label'], destLayout['label'])) {
          if (_.isEqual(sourceLayout['label'], startLayout['label'])) {
            sourceLayout['label'] = destLayout['label']
          }
        }
        
        if (!_.isEqual(sourceLayout['fields'], destLayout['fields'])) {
          sourceLayout['fields'] = mergeOrderedList(sourceLayout, startLayout, destLayout, 'fields')
        }

        sourceMap.set(key, sourceLayout)
      }
    } 
  }

  var finalKeys = [...sourceMap.keys()].sort()
  var returnList = []

  for (key of finalKeys) {
    returnList.push(sourceMap.get(key))
  }

  if (returnList.length == 1) {
    returnList = returnList[0]
  }

  return returnList;


}

function mergeFilters(source, start, dest) {
  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKey(source,'field')
  var startMap = mapArrayGivenKey(start, 'field')
  var destMap = mapArrayGivenKey(dest, 'field')

  var keysInDestOnly = [...destMap.keys()].filter(function(e){
    return !sourceMap.has(key) & !startMap.has(e)
  })

  var keysRemoveInDest =  [...startMap.keys()].filter(function(e){
    return !destMap.has(key)
  })

  var commonKeys = [...sourceMap.keys()].filter(function(e){
    return destMap.has(e)
  })

  for (key of keysRemoveInDest) {
    if (_.isEqual(sourceMap.get(key), startMap.get(key))) {
      sourceMap.delete(key)
      
    }
  }

  for (key of keysInDestOnly) {
    sourceMap.set(key, destMap.get(key))
  }

  for (key of commonKeys) {
    if (!_.isEqual(sourceMap.get(key), destMap.get(key))) {
      if (_.isEqual(sourceMap.get(key), startMap.get(key))) {
        sourceMap.set(key, destMap.get(key))
      }
    }
  }

  var finalKeys = [...sourceMap.keys()].sort()
  var returnList = []

  for (f of finalKeys) {
    returnList.push(sourceMap.get(f))
  }

  if (returnList.length==1) {
    returnList = returnList[0]
  }

  return returnList
}

function mergeListViews(source,start,dest) {

  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapArrayGivenKey(source,'fullName')
  var startMap = mapArrayGivenKey(start, 'fullName')
  var destMap = mapArrayGivenKey(dest, 'fullName')

  var keysInDestOnly = [...destMap.keys()].filter(function(e){
    return !sourceMap.has(key) & !startMap.has(e)
  })

  var keysRemoveInDest =  [...startMap.keys()].filter(function(e){
    return !destMap.has(key)
  })

  var commonKeys = [...sourceMap.keys()].filter(function(e){
    return destMap.has(e)
  })

  for (key of keysRemoveInDest) {
    if (_.isEqual(sourceMap.get(key), startMap.get(key))) {
      sourceMap.delete(key)
      
    }
  }

  for (key of keysInDestOnly) {
    sourceMap.set(key, destMap.get(key))
  }

  for (key of commonKeys) {
    if (startMap.has(key)) {
      
      var sourceList = sourceMap.get(key)
      var startList = startMap.get(key)
      var destList = destMap.get(key)

      if (!_.isEqual(sourceList, destList)) {

        if (!_.isEqual(sourceList['label'], destList['label'])) {
          if (_.isEqual(sourceList['label'], startList['label'])) {
            sourceList['label'] = destList['label']
          }
        }

        if (!_.isEqual(sourceList['filterScope'], destList['filterScope'])) {
          if (_.isEqual(sourceList['filterScope'], startList['filterScope'])) {
            sourceList['filterScope'] = destList['filterScope']
          }
        }
        
        if (!_.isEqual(sourceList['columns'], destList['columns'])) {
          sourceList['columns'] = mergeOrderedList(sourceList, startList, destList, 'columns')
        }

        if (!_.isEqual(sourceList['filters'], destList['filters'])) {
          sourceList['filters'] = mergeFilters(sourceList['filters'], startList['filters'], destList['filters'])
        }

        sourceMap.set(key, sourceList)
      }
    } 
  }

  var finalKeys = [...sourceMap.keys()].sort()
  var returnList = []

  for (key of finalKeys) {
    returnList.push(sourceMap.get(key))
  }

  if (returnList.length == 1) {
    returnList = returnList[0]
  }

  return returnList;


}

function mergeActionOverides(source,start,dest) {
  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = mapfromArray(source,true)
  var startMap = mapfromArray(start, true)
  var destMap = mapfromArray(dest, true)

  var keysInDestOnly = [...destMap.keys()].filter(function(e){
    return !sourceMap.has(key) && !startMap.has(e)
  })

  var keysRemoveInDest =  [...startMap.keys()].filter(function(e){
    return !destMap.has(key)
  })

  var commonKeys = [...sourceMap.keys()].filter(function(e){
    return destMap.has(e)
  })

  for (key of keysRemoveInDest) {
    if (_.isEqual(sourceMap.get(key), startMap.get(key))) {
      sourceMap.delete(key)
      
    }
  }

  for (key of keysInDestOnly) {
    sourceMap.set(key, destMap.get(key))
  }

  for (key of commonKeys) {
    if (startMap.has(key)) {
      
      var sourceAction = sourceMap.get(key)
      var startAction = startMap.get(key)
      var destAction = destMap.get(key)

      if (!_.isEqual(sourceAction, destAction)) {
        for (element in sourceAction) {
          var presentAtStart = startAction.hasOwnProperty(element)
          var presentAtDest = destAction.hasOwnProperty(element)

          if (presentAtStart == true && presentAtDest == false) {
            if (_.isEqual(sourceAction[element], startAction[element])) {
              delete sourceAction[element]
            }
          } else if (presentAtStart == true &&presentAtDest == true) {

            if (!_.isEqual(sourceAction[element], destAction[element])) {

              if (_.isEqual(sourceAction[element], startAction[element])) {
                sourceAction[element] = destAction[element]
              } 

            }

          }

        }

        sourceMap.set(key, sourceAction)
      }
    } 
  }

  var finalKeys = [...sourceMap.keys()].sort()
  var returnList = []

  for (key of finalKeys) {
    returnList.push(sourceMap.get(key))
  }

  if (returnList.length == 1) {
    returnList = returnList[0]
  }

  return returnList;
}

function mergeElementHandler (source, start, dest, key) {

  var presentAtStart = start.hasOwnProperty(key)
  var presentAtDest = dest.hasOwnProperty(key)
  var twoWayMerge = false

  if (presentAtStart == false && presentAtDest == false) {
    return source;
  } else if ( presentAtStart == false && presentAtDest == true) {
    twoWayMerge = true
  } else if (presentAtStart == true && presentAtDest == false) {
    if (_.isEqual(source[key], start[key])) {
      delete source[key]
      return source
    }
  } 

  if (_.isEqual(source[key], dest[key])) {
    return source
  }
  
  switch(key) {
    case 'actionOverrides' :
      if (twoWayMerge == true) {
        source[key] = mergeActionOverides(source[key],[], dest[key])
      } else {
        source[key] = mergeActionOverides(source[key],start[key], dest[key])
      }
      break
    case 'businessProcesses' :
      if (twoWayMerge == true) {
        source[key] = mergeBusinessProcess(source[key],[], dest[key])

      } else {
        source[key] = mergeBusinessProcess(source[key],start[key], dest[key])
        
      }
      break
    case 'compactLayouts' :
      if (twoWayMerge == true) {
        source[key] = mergeCompactLayouts(source[key],[], dest[key])

      } else {
        source[key] = mergeCompactLayouts(source[key],start[key], dest[key])
        
      }
      break
    case 'listViews':
      if (twoWayMerge == true) {
        source[key] = mergeListViews(source[key],[], dest[key])

      } else {
        source[key] = mergeListViews(source[key],start[key], dest[key])
        
      }
      break
    case 'recordTypes':
      if (twoWayMerge == true) {
        source[key] = mergeRecordTypes(source[key],[], dest[key])

      } else {
        source[key] = mergeRecordTypes(source[key],start[key], dest[key])
        
      }
      break
    case 'searchLayouts':
      if (twoWayMerge == true) {
        source[key] = mergeSearchLayouts(source[key],null, dest[key])

      } else {
        source[key] = mergeSearchLayouts(source[key],start[key], dest[key])
        
      }
      break
    case 'validationRules':
      if (twoWayMerge == true) {
        source[key] = mergeListObj(source[key],null, dest[key])

      } else {
        source[key] = mergeListObj(source[key],start[key], dest[key])
        
      }
      break
    case 'webLinks':
      if (twoWayMerge == true) {
        source[key] = mergeListObj(source[key],null, dest[key])

      } else {
        source[key] = mergeListObj(source[key],start[key], dest[key])
        
      }
      break
    default:
      if (start.hasOwnProperty(key)) {

        if (!_.isEqual(source[key], dest[key])) {
          if (_.isEqual(source[key], start[key])) {
            source[key] = dest[key]
          }
        }



      }
  }


  return source;
}


function mergeSearchLayouts(source,start,dest) {
  
  if (start == null) {
    for (elem in source) {

      if (!_.isEqual(source[elem], dest[elem])) {
        source[elem] = mergeOrderedList(source,{elem:[]}, dest,elem)

      }

    }
  } else {
    if (!_.isEqual(source[elem], dest[elem])) {
      source[elem] = mergeOrderedList(source,start, dest,elem)

    }
  }

  return source[elem]
}

function buildRelease (source, start, dest) {
  
  //for mandatory keys - we need to merge in any differences that are found between destMaster
  var sourceObject = source['CustomObject']
  

  var startObject = start['CustomObject']
  var destObject = dest['CustomObject']
  newKeysInDest = findNewKeys(sourceObject, destObject)
  newKeysInSource = findNewKeys(destObject, sourceObject)

  sourceObject = addNewKeys(sourceObject, destObject, newKeysInDest)
  //No stripping or anything fancy if its a custom setting, just return object as is
  if (sourceObject.hasOwnProperty('customSettingsType')) {
    return source
  }

  for (mandKey of mandatory) {
    if (sourceObject[mandKey]) {

      var changedDuringBranch = !_.isEqual(startObject[mandKey], sourceObject[mandKey])
      var changesBetweenStartDest  = !_.isEqual(destObject[mandKey], startObject[mandKey])
      var differentToDest = !_.isEqual(destObject[mandKey], sourceObject[mandKey])

      if (changesBetweenStartDest != false && differentToDest != false) {
        if (changedDuringBranch == false) {
          sourceObject[mandKey] = destObject[mandKey]
        } else {
          sourceObject[mandKey] = mergeMandatory(sourceObject[mandKey], startObject[mandKey], destObject[mandKey])
        }

      }
    } 
  }

  var presentKeys = []

  for (regKey in sourceObject){
    if (!mandatory.includes(regKey) ) {
      presentKeys.push(regKey)
    }
  }

  var doneFields =[]
  var keysToDelete = []
  for (regKey of presentKeys) {
   
    if (!doneFields.includes(regKey)) {

      if (regKey == 'fields') {
        sourceObject['fields'] = handleFields(sourceObject['fields'], startObject['fields'], destObject['fields'],passDoDelete)
        doneFields.push('fields')
        continue;
      }

      //Indicates the element only exists in our current branch (source)
      if (!startObject[regKey] || !destObject[regKey]) {
        continue
      }
      var changedDuringBranch = !_.isEqual(startObject[regKey], sourceObject[regKey])
      var changesBetweenStartDest  = !_.isEqual(destObject[regKey], startObject[regKey])
      var differentToDest = !_.isEqual(destObject[regKey], sourceObject[regKey])
      //IF an object isn't part of our current branch/feature we don't need it
      if (changedDuringBranch == false  ) {
        keysToDelete.push(regKey)
        continue
      }


      sourceObject[regKey] = mergeElement(sourceObject[regKey], startObject[regKey], destObject[regKey], passDoDelete)
    }
  }

  for (key of keysToDelete) {
    delete sourceObject[key]
  }

  source['CustomObject'] = sourceObject  

  return source
}

//Assume top level objects/arrays      have changes in source & dest
function mergeElement(source, start, dest, doDelete) {
  var changedDuringBranch, changesAhead, changesBetweenStartDest, differentToDest,createdDuringBranch
  
  //If its not in other branches its new
  if (!start || !dest) {
    return source
  }
  
  if (Array.isArray(source)) {
    var sourceMap = mapfromArray(source,true)
    var destMap = mapfromArray(dest,true)
    var startMap = mapfromArray(start,true)
    
    var toDelete = []
    
    if (doDelete == false) {
      
    } else {
      for (let [k,v] of sourceMap) {
        //Triival - no change no need
        if (startMap.has(k) && _.isEqual( startMap.get(k), sourceMap.get(k))) {
          toDelete.push(k)
          continue;
        }
        
        // new so keep
        if (!startMap.has(k)) {
          
        } else if(destMap.has(k) && !_.isEqual(sourceMap.get(k), destMap.get(k))) {
          changedDuringBranch = !_.isEqual(sourceMap.get(k),startMap.get(k)) || false
          changesBetweenStartDest  = !_.isEqual(destMap.get(k), startMap.get(k))
          
          if (changesBetweenStartDest == true) {
            sourceMap.set(k, mergeElement(sourceMap.get(k), startMap.get(k), destMap.get(k)))
          }
          
        }
      }
      
      for (prop of toDelete) {
        sourceMap.delete(prop)
      }
    }
    
    return [...sourceMap.values()]
    
  } else {
    for (k in source) {
      if (k == xmlKey) {
        changedDuringBranch = !_.isEqual(source[k],start[k]) || false
        changesBetweenStartDest  = !_.isEqual(dest[k], start[k])
        
        if (changedDuringBranch == false && changesBetweenStartDest != false) {
          source[k] = dest[k]
        } 
      }
      else if (source[k].hasOwnProperty(xmlKey)) {
        
        if (!start[k]) {
          continue
        }
        
        changedDuringBranch = !_.isEqual(source[k][xmlKey],start[k][xmlKey]) || false
        changesBetweenStartDest  = !_.isEqual(dest[k][xmlKey], start[k][xmlKey])
        
        if (changedDuringBranch == false && changesBetweenStartDest != false) {
          source[k][xmlKey] = dest[k][xmlKey]
        } 
      } else {
        source[k] = mergeElement(source[k], start[k], dest[k], false)
      }
    }
  }
 
  
  return source
}


function mapfromArray (anArray, withSize) {
  var theKey;
  if (withSize ==true) {
    theKey =  findUniqueKey(anArray)
  } else {
    theKey = findUniqueKeyWithoutSize(anArray)
  }

  theKey = theKey.replace(/[0-9]/g, '');
  var theMap = new Map()
  for (a of anArray) {
    var numProp = Object.keys(a).length

    if (withSize == false) {
      numProp = ''
    }
    if (theKey != xmlKey) {
      theMap.set(a[theKey][xmlKey]+numProp, a)
    } else {
      theMap.set(a[theKey]+numProp, a)
    }
    
  }
  return theMap
}

function handleFields(source, start, dest, doDelete) {
  

  if (!Array.isArray(source)) {
    source = [source]
  }

  if (!Array.isArray(start)) {
    start = [start]
  }

  if (!Array.isArray(dest)) {
    dest = [dest]
  }

  var sourceMap = makeFieldMap(source)
  var destMap = makeFieldMap(dest)
  var startMap = makeFieldMap(start)
  
  var changeFieldsInSource = [];
  var masterDetailFields = [];
  
  for (let [k,v] of destMap) {
    
    if (v.hasOwnProperty('type') && v['type'][xmlKey] == 'masterDetail') {
      if (!masterDetailFields.has(k)) {
        masterDetailFields.push(k)
      }
    }
  }
  
  for (let [k,v] of sourceMap) {
    if (!destMap.has(k)) {
      changeFieldsInSource.push(k)
    } else if (!_.isEqual(v, startMap.get(k))) {
      changeFieldsInSource.push(k)
    } else if (v.hasOwnProperty('type') && v['type'][xmlKey] == 'masterDetail') {
      if (!masterDetailFields.has(k)) {
        masterDetailFields.push(k)
      }
    }
  }
  
  var returnList = []
  
  if (doDelete == false) {
    var newFieldsInDest = []
    for (let [k,v] of destMap) {
      if (!sourceMap.has(k)) {
        newFieldsInDest.push(k)
      } 
    }
    
    for (field of newFieldsInDest) {
      sourceMap.set(destMap.get(field)['fullName'][xmlKey], field)
    }
    returnList = [sourceMap.values].sort()
  } else {
    
    
    var fieldsToKeep = []
    fieldsToKeep = fieldsToKeep.concat(masterDetailFields)
    fieldsToKeep = fieldsToKeep.concat(changeFieldsInSource)
    
    for (f of fieldsToKeep) {
      
      if (sourceMap.has(f)) {
        returnList.push(sourceMap.get(f))
      } else {
        returnList.push(destMap.get(f))
      }
      
    }
  }
  
  
  
  return returnList;
}

function makeFieldMap(arrayFields) {
  var returnMap = new Map() 
  for (var f of arrayFields) {
    returnMap.set(f['fullName'][xmlKey], f)
  }
  return returnMap
}

function addNewKeys(targetObj, sourceObj, keys) {
  for (var k of keys) {
    targetObj[k] = sourceObj[k]
  }
  return targetObj
}

function mergeMandatory (sourceObject, startObject, destObject) {
  if (Array.isArray(source)) {
    var sourceMap = mapfromArray(sourceObject,true)
    var startMap = mapfromArray(startObject,true)
    var destMap = mapfromArray(destObject,true)
    
    var elementsToAdd = []
    
    if (destMap.prototype.size > sourceMap.prototype.size) {
      for (let [k,v] of destMap) {
        if (!sourceMap.has(k)) {
          elementsToAdd.push(destMap.get(k))
        }
      }
    }
    
    for (let [k,v] of sourceMap) {
      
      
      //If the destination laready has this element lets merge
      if (destObject.has(k)) {
        
        changesBetweenStartDest  = !_.isEqual(destMap.get(k), startMap.get(k))
        changedDuringBranch = !_.isEqual(startMap.get(k), sourceMap.get(k))
        
        //An array element was changed in the destintation but not oru branch
        if (changedDuringBranch == false && changesBetweenStartDest != false) {
          sourceMap.get(k) = destMap.get(k)
        } else if (changedDuringBranch == true && changesBetweenStartDest == true) {
          //if changed in both our branch and dest we need to merge the object
          for (objKey in sourceMap.get(k)) {
            changesBetweenStartDest  = !_.isEqual(destMap.get(k)[objKey], startMap.get(k)[objKey])
            changedDuringBranch = !_.isEqual(startMap.get(k)[objKey], sourceMap.get(k)[objKey])
            
            //Only if a key was only edited in destination do we want to bring it in, otherwise everything remains as is
            if (changesBetweenStartDest == true && changedDuringBranch == false) {
              sourceMap.get(k)[objKey] = destMap.get(k)[objKey]
            }
          }
        }
      }
    }
    
    
    var returnList = []
    for (let [k,v] of sourceMap) {
      returnList.push(sourceMap.get(k))
    }
    
    for (elem of elementsToAdd) {
      returnList.push(elem)
    }
    
    return returnList
  } else if (sourceObject instanceof object){
    
    for (k in destObject) {
      if (!sourceObject.hasOwnProperty(k)) {
        sourceObject[k] = destObject[k]
      }
    }
    
    for (k in sourceObject) {
      changesBetweenStartDest  = !_.isEqual(destMap[k], startMap[k])
      changedDuringBranch = !_.isEqual(startMap[k], sourceMap[k])
      
      //Only if a key was only edited in destination do we want to bring it in, otherwise everything remains as is
      if (changesBetweenStartDest == true && changedDuringBranch == false) {
        if (sourceObject[k].hasOwnProperty(xmlKey)) {
          sourceObject[k] = destMap[k]
        } else {
          sourceObject[k] = mergeElement(source[k], start[k], dest[k], false)
        }
      }
    }
    
    return sourceObject
  }
}

function findUniqueKey (anArray) {
  for (var element of anArray) {
    var numProp = Object.keys(element).length
    for (var k in element) {

      if (k == xmlKey) {
        return k
      }

      if (!element[k].hasOwnProperty(xmlKey)) {
        continue;
      } 

      var encounteredValues = [element[k][xmlKey]+numProp]
      var isUnique = true;
      for (var anotherElement of anArray) {
        if (!_.isEqual(element, anotherElement)) {

          var otherNumProp = Object.keys(anotherElement).length

          if (encounteredValues.includes(anotherElement[k][xmlKey]+otherNumProp)) {
            isUnique = false;
            break;
          } else {
            encounteredValues.push(anotherElement[k][xmlKey])
          }
        }
      }
      if (isUnique == true) {
        return k;
      }
    }
    return null;
  }

}

function findUniqueKeyWithoutSize (anArray) {
  for (var element of anArray) {
    for (var k in element) {
      
      if (k == xmlKey) {
        return k
      }

      if (!element[k].hasOwnProperty(xmlKey)) {
        continue;
      } 
      var encounteredValues = [element[k][xmlKey]]
      var isUnique = true;
      for (var anotherElement of anArray) {
        if (!_.isEqual(element, anotherElement)) {

          if (encounteredValues.includes(anotherElement[k][xmlKey])) {
            isUnique = false;
            break;
          } else {
            encounteredValues.push(anotherElement[k][xmlKey])
          }
        }
      }
      if (isUnique == true) {
        return k;
      }
    }

    console.log('couldn find unique key')
    return null;
  }

}

function findNewKeys(a, b) {
  var newKeys = []
  for (k in b) {
    if (!a.hasOwnProperty(k)) {
      newKeys.push(k)
    }
  }
  return newKeys
}
