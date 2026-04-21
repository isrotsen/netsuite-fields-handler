/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * @description Client Script that loads JSON field configuration via RESTlet
 *              and applies cascading field enable/disable rules in real time
 *
 * Date                Author                                             Remarks
 * 16 Apr 2026         Nestor Avila <development@nestoravila.net>          - Init
 */

define([
  'N/runtime',
  'N/url',
  'N/https',
  'N/currentRecord',
  './sweetalert2.all.js',
  './nac_lib_constants',
  './nac_lib_fields_handler'
], (runtime, url, https, currentRecord, Swal, libConstants, libFieldsHandler) => {

  const FILE_NAME = 'nac_cs_fields_handler'
  const ALLOW_MODES = [libConstants.MODES.CREATE, libConstants.MODES.COPY, libConstants.MODES.EDIT]
  const ALERT_TYPE = { ERROR: 'error', WARNING: 'warning', SUCCESS: 'success' }
  const ALERT_TITLE = { error: 'OOPS!', warning: 'WARNING!', success: 'SUCCESS!' }

  let fieldActionCFG
  let fieldList
  let mode


  const pageInit = (context) => {
    const FN = `${FILE_NAME} -> pageInit`
    try {
      window.onbeforeunload = () => null

      mode = context.mode

      if (!ALLOW_MODES.includes(mode)) return

      const script = runtime.getCurrentScript()
      const SCRIPTS = libConstants.SCRIPTS
      const deploymentId = script.getParameter({ name: SCRIPTS.CS_FIELDS_HANDLER.PARAMETERS.FILE_CFG })
      const fileName = script.getParameter({ name: SCRIPTS.CS_FIELDS_HANDLER.PARAMETERS.FILE_NAME })

      if (!deploymentId || !fileName) {
        log.error({ title: FN, details: 'Missing script parameters: FILE_CFG or FILE_NAME' })
        return
      }

      loadConfiguration({ deploymentId, fileName })
    } catch (error) {
      log.error({ title: FN, details: error.message || 'Unexpected error' })
      showAlert({ icon: ALERT_TYPE.WARNING, message: `${FN}: ${error.message}` })
    }
  }


  const fieldChanged = (context) => {
    const FN = `${FILE_NAME} -> fieldChanged`
    try {
      if (!fieldActionCFG) return

      libFieldsHandler.triggerNestedAction({
        fieldList,
        fieldActionCFG,
        context,
        mode,
        isNested: true
      })
    } catch (error) {
      log.error({ title: FN, details: error.message || 'Unexpected error' })
      showAlert({ icon: ALERT_TYPE.WARNING, message: `${FN}: ${error.message}` })
    }
  }


  const loadConfiguration = ({ deploymentId, fileName }) => {
    const FN = `${FILE_NAME} -> loadConfiguration`

    showLoader({ message: 'GETTING CONFIGURATION...!' })

    const resolvedUrl = url.resolveScript({
      scriptId: libConstants.SCRIPTS.RL_CONFIGURATION.ID,
      deploymentId,
      returnExternalUrl: false
    })

    https.post.promise({
      url: resolvedUrl,
      body: { fileName },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }).then((response) => {
      Swal.close()

      if (response.code !== 200) {
        showAlert({ icon: ALERT_TYPE.ERROR, message: response.body })
        return
      }

      const result = JSON.parse(response.body)

      if (!result.isSuccess) {
        showAlert({ icon: ALERT_TYPE.ERROR, message: result.message })
        return
      }

      applyConfiguration({ recordsFieldsActionsCFG: result.data })
      log.debug(`${FN} - fieldActionCFG`, fieldActionCFG)
    }).catch((reason) => {
      Swal.close()
      log.error({ title: FN, details: reason })
      showAlert({ icon: ALERT_TYPE.ERROR, message: String(reason) })
    })
  }


  const applyConfiguration = ({ recordsFieldsActionsCFG }) => {
    const FN = `${FILE_NAME} -> applyConfiguration`
    try {
      const MODES = libConstants.MODES
      const record = currentRecord.get()
      const baseRecordType = record.getValue({ fieldId: libConstants.RECORD_FIELDS.BASE_RECORD_TYPE })
      const formId = record.getValue({ fieldId: libConstants.RECORD_FIELDS.CUSTOM_FORM })
      const recordConfig = recordsFieldsActionsCFG?.[baseRecordType]

      if (!recordConfig?.nestedEnabledActionByForm) return

      fieldList = recordConfig.fieldList

      const nestedConfig = recordConfig.nestedEnabledActionByForm
      if (nestedConfig?.[formId]) {
        fieldActionCFG = nestedConfig[formId]
      } else if (nestedConfig?.[MODES.ALL]) {
        fieldActionCFG = nestedConfig[MODES.ALL]
      }
    } catch (error) {
      log.error({ title: FN, details: error.message || 'Unexpected error' })
      throw error
    }
  }


  const showLoader = ({ message }) => {
    Swal.fire({
      title: message,
      html: 'This action can take a few minutes...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    })
  }


  const showAlert = ({ icon, message }) => {
    Swal.fire({
      icon,
      title: ALERT_TITLE[icon] ?? 'NOTICE',
      text: message
    })
  }


  return {
    pageInit,
    fieldChanged
  }
})
