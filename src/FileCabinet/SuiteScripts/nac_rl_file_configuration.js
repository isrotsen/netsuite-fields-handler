/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 *
 * @description RESTlet that serves JSON configuration files from the File Cabinet
 *
 * Date                Author                                             Remarks
 * 16 Apr 2026         Nestor Avila <development@nestoravila.net>          - Init
 */

define(['./nac_lib_json_file_configuration'], (libJSONFile) => {

    const ALLOWED_FILENAME = /^nac_[A-Za-z0-9_-]+\.json$/

    const post = (dataIn) => {
        try {
            if (!dataIn?.fileName) {
                return {
                    isSuccess: false,
                    message: 'fileName is required'
                }
            }
            if (!ALLOWED_FILENAME.test(dataIn.fileName)) {
                return {
                    isSuccess: false,
                    message: 'fileName is not allowed'
                }
            }
            return {
                isSuccess: true,
                data: libJSONFile.getJSONFile({ fileName: dataIn.fileName })
            }
        } catch (error) {
            return {
                isSuccess: false,
                message: error.message || 'Unexpected error, contact your administrator'
            }
        }
    }

    return {
        post
    }
})
