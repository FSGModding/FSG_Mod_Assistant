# Short Doc - API Calls

## fileHandlerAsync

- new(fileName, isFolder, log)
- open() _async_ => isOpen
- isOpen _getter_
- list _getter_ => file list (just names)
- listFiles _getter_ => file list (more info)
- close()
- exists(fileName) => true/false
- fileInfo(fileName) => file info from listFiles by index
- relativeFolder(fileName) => path.join(...fileName)
- readText(fileName) _async_ => contents
- readBin(fileName) _async_ => contents as buffer
- readXML(fileName, type, defaultKey) => _async_ => contents as tree
