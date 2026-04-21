/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * @description User Event that loads JSON config and applies field display rules,
 *              sublist column settings, and dynamic buttons on beforeLoad
 *
 * Date                Author                                             Remarks
 * 16 Apr 2026         Nestor Avila <development@nestoravila.net>          - Init
 */

define([
  'N/runtime',
  './nac_lib_constants',
  './nac_lib_json_file_configuration',
  './nac_lib_fields_handler'
], (runtime, libConstants, libJSONFile, libFieldsHandler) => {

  const FILE_NAME = 'nac_ue_fields_handler'

  const beforeLoad = (context) => {
    const FN = `${FILE_NAME} -> beforeLoad`
    try {
      const SCRIPT = libConstants.SCRIPTS.UE_FIELDS_HANDLER
      const fileName = runtime
        .getCurrentScript()
        .getParameter({ name: SCRIPT.PARAMETERS.JSON_FILE })

      if (!fileName) throw new Error('No JSON config file configured')

      const jsonConfig = libJSONFile.getJSONFile({ fileName })
      const { type, form, newRecord } = context
      const baseRecordType = newRecord.getValue({ fieldId: libConstants.RECORD_FIELDS.BASE_RECORD_TYPE })

      log.audit(FN, { baseRecordType })

      const recordConfig = jsonConfig?.[baseRecordType]
      if (!recordConfig || recordConfig._error) return

      libFieldsHandler.recordHandler({ form, type, recordConfig, newRecord })
    } catch (error) {
      log.error({
        title: FN,
        details: error.message || 'Unexpected error'
      })
    }
  }

  return {
    beforeLoad
  }
})