/**
 * @NApiVersion 2.1
 * Date                Author                                             Remarks
 * 16 Apr 2026         Nestor Avila <development@nestoravila.net>          - Init
 */

define(['N/search', 'N/file'], (search, file) => {

    const FILE_NAME = 'nac_lib_json_file_configuration'

    const getJSONFile = ({ fileName }) => {
        const FN = `${FILE_NAME} -> getJSONFile`
        try {
            let fileData = null
            const ssConfigFile = search.create({
                type: 'file',
                filters: [
                    ['name', search.Operator.IS, fileName]
                ],
                columns: [
                    'internalid'
                ]
            }).run().getRange({ start: 0, end: 1 })
            if (ssConfigFile.length) {
                const fileId = ssConfigFile[0].id
                if (fileId) {
                    const fileObj = file.load({ id: fileId })
                    fileData = fileObj.getContents()
                    if (fileData) {
                        try {
                            fileData = JSON.parse(fileData)
                        } catch (error) {
                            log.error({
                                title: `${FN} error`,
                                details: { message: `${FN} - ${`Error in parse JSON`} - ${fileData}` }
                            })
                            throw new Error(`${FN} - ${error.message || 'Unexpected error'}`)
                        }
                    }
                }
            }
            return fileData
        } catch (error) {
            throw new Error(`${FN} - ${error.message || 'Unexpected error'}`)
        }
    }

    return {
        getJSONFile
    }
})
