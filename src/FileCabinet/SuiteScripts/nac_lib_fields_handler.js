/**
 * @NApiVersion 2.1
 * Date                Author                                             Remarks
 * 16 Apr 2026         Nestor Avila <development@nestoravila.net>          - Init
 */

define(['./nac_lib_constants', './nac_lib_field_functions'],
    (libConstants, libFieldFunctions) => {

        const FILE_NAME = 'nac_lib_fields_handler'

        const triggerNestedAction = ({ fieldList, fieldActionCFG, context, mode, isNested = false, isForm = false }) => {
            const FN = `${FILE_NAME} -> triggerNestedAction`
            try {
                const { currentRecord, fieldId } = { ...context }
                let fieldActions = fieldActionCFG?.[fieldId]
                log.debug('fieldList', fieldList)
                log.debug('fieldId', fieldId)
                if (!fieldActions || !Array.isArray(fieldActions)) {
                    if (!isNested) {
                        fieldList.forEach(_fieldId => {
                            if (_fieldId !== fieldId) {
                                changeFieldDisplayMode({ currentRecord, fieldIdChange: _fieldId, isDisabled: true })
                            }
                        })
                    }
                    return
                }
                const currentValueField = currentRecord.getValue({ fieldId: fieldId })
                log.debug('fieldActions', fieldActions)
                log.debug('currentValueField', currentValueField)
                if (!currentValueField) {
                    const allRelatedFields = new Set()
                    fieldActions.forEach(action => {
                        action.fieldsForEnabling?.forEach(relatedField => {
                            allRelatedFields.add(relatedField)
                            if (fieldActionCFG[relatedField]) {
                                fieldActionCFG[relatedField].forEach(nestedAction => {
                                    nestedAction.fieldsForEnabling?.forEach(nestedField => {
                                        allRelatedFields.add(nestedField)
                                    })
                                })
                            }
                        })
                    })
                    Array.from(allRelatedFields).forEach(fieldToDisable => {
                        changeFieldDisplayMode({
                            currentRecord,
                            fieldIdChange: fieldToDisable,
                            isDisabled: true
                        })
                    })
                    return
                }
                fieldActions = fieldActions.filter(_fieldAction =>
                    _fieldAction.valuesTrigger.includes(Number(currentValueField)) &&
                    _fieldAction.modes.includes(mode)
                )
                log.debug('fieldActions filtered', fieldActions)
                const fieldsEnabled = []
                fieldActions.forEach(fieldAction => {
                    const processFields = ({ fields, isDisabled }) => {
                        fields?.forEach(fieldIdChange => {
                            fieldsEnabled.push(fieldIdChange)
                            changeFieldDisplayMode({ currentRecord, fieldIdChange, isDisabled, isForm })
                            const nestedFieldActions = fieldActionCFG[fieldIdChange]
                            if (!isDisabled && nestedFieldActions && Array.isArray(nestedFieldActions)) {
                                const currentNestedValue = currentRecord.getValue({ fieldId: fieldIdChange })
                                if (currentNestedValue) {
                                    nestedFieldActions.forEach(nestedFieldAction => {
                                        if (nestedFieldAction.modes.includes(mode) &&
                                            nestedFieldAction.valuesTrigger.includes(Number(currentNestedValue)) &&
                                            nestedFieldAction?.fieldsForEnabling?.length) {
                                            processFields({ fields: nestedFieldAction.fieldsForEnabling, isDisabled })
                                        }
                                    })
                                }
                            }
                        })
                    }
                    processFields({ fields: fieldAction.fieldsForEnabling, isDisabled: false })
                })
                if (isNested) return
                fieldList.forEach(_fieldId => {
                    if (!fieldsEnabled.includes(_fieldId) && _fieldId !== fieldId) {
                        changeFieldDisplayMode({ currentRecord, fieldIdChange: _fieldId, isDisabled: true, isForm })
                    }
                })
            } catch (error) {
                throw new Error(`${FN} - ${error.message || 'Unexpected error'}`)
            }
        }

        const changeFieldDisplayMode = ({ currentRecord, fieldIdChange, isDisabled, isForm }) => {
            const FN = `${FILE_NAME} -> changeFieldDisplayMode`
            try {
                const field = isForm ? isForm.getField({ id: fieldIdChange }) : currentRecord.getField({ fieldId: fieldIdChange })
                if (field) {
                    if (isForm) {
                        field.updateDisplayType({ displayType: libConstants.DISPLAY_TYPES.NORMAL })
                    } else {
                        field.isDisabled = isDisabled
                    }
                    if (isDisabled) currentRecord.setValue({ fieldId: fieldIdChange, value: '', ignoreFieldChange: true })
                }
            } catch (error) {
                throw new Error(`${FN} - ${error.message || 'Unexpected error'}`)
            }
        }

        const recordHandler = ({ form, type, recordConfig, newRecord }) => {
            const FN = `${FILE_NAME} -> recordHandler`
            try {
                let _recordConfigHeaderFields
                let _recordConfigSublist
                let fieldList
                let fieldActionCFG
                let mode = type
                const MODES = libConstants.MODES
                const formId = newRecord.getValue({ fieldId: libConstants.RECORD_FIELDS.CUSTOM_FORM })
                if (recordConfig.hasOwnProperty('fieldList')) {
                    fieldList = recordConfig?.fieldList
                }
                if (recordConfig.hasOwnProperty('nestedEnabledActionByForm')) {
                    if (recordConfig.nestedEnabledActionByForm.hasOwnProperty(formId)) {
                        fieldActionCFG = recordConfig.nestedEnabledActionByForm[formId]
                    } else if (recordConfig.nestedEnabledActionByForm.hasOwnProperty(MODES.ALL)) {
                        fieldActionCFG = recordConfig.nestedEnabledActionByForm[MODES.ALL]
                    }
                }
                if (recordConfig.hasOwnProperty('header') && recordConfig.header.hasOwnProperty(formId)) {
                    _recordConfigHeaderFields = recordConfig?.header?.[formId]
                } else if (recordConfig.hasOwnProperty('header') && recordConfig.header?.hasOwnProperty(MODES.ALL)) {
                    _recordConfigHeaderFields = recordConfig?.header?.[MODES.ALL]
                }
                if (recordConfig.hasOwnProperty('sublists') && recordConfig.sublists.hasOwnProperty(formId)) {
                    _recordConfigSublist = recordConfig?.sublists?.[formId]
                } else if (recordConfig.hasOwnProperty('sublists') && recordConfig.sublists?.hasOwnProperty(MODES.ALL)) {
                    _recordConfigSublist = recordConfig?.sublists?.[MODES.ALL]
                }
                if (recordConfig.hasOwnProperty('buttonsCFG')) {
                    buttonsLogic({ buttonsCFG: recordConfig?.buttonsCFG, form, newRecord, type })
                }
                log.debug('_recordConfigHeaderFields', _recordConfigHeaderFields)
                if (_recordConfigHeaderFields) {
                    _recordConfigHeaderFields.forEach(_field => {
                        if (!_field.modes.includes(type)) return
                        let pass = true
                        if (_field.hasOwnProperty('conditions')) {
                            pass = validateConditions({ conditions: _field?.conditions, _record: newRecord })
                        }
                        if (_field.hasOwnProperty('conditions') && !pass) return
                        const field = form.getField({ id: _field.fieldid })
                        if (_field.hasOwnProperty('valuesTrigger') && _field.hasOwnProperty('fieldsForEnabling')) {
                            const currentFieldValue = newRecord.getValue({ fieldId: _field.fieldid })
                            const triggerValue = _field?.valuesTrigger
                            let shouldEnable = false
                            if (typeof _field.valuesTrigger === 'boolean') {
                                shouldEnable = currentFieldValue === triggerValue
                            } else if (Array.isArray(triggerValue)) {
                                const numericValue = typeof currentFieldValue === 'boolean'
                                    ? currentFieldValue
                                    : Number(currentFieldValue)
                                shouldEnable = triggerValue.includes(numericValue)
                            }
                            log.debug('shouldEnable', shouldEnable)
                            if (shouldEnable && Array.isArray(_field?.fieldsForEnabling)) {
                                _field.fieldsForEnabling.forEach(fieldIdToEnable => {
                                    const fieldToEnable = form.getField({ id: fieldIdToEnable })
                                    if (fieldToEnable) {
                                        fieldToEnable.updateDisplayType({ displayType: libConstants.DISPLAY_TYPES.NORMAL })
                                        triggerNestedAction({ fieldList, fieldActionCFG, context: { currentRecord: newRecord, fieldId: fieldIdToEnable }, mode, isNested: true, isForm: form })
                                    }
                                })
                            }
                        }
                        if (field) {
                            field.updateDisplayType({ displayType: _field.displayOption })
                            if (_field["isMandatory"]) field.isMandatory = _field.isMandatory
                        }
                    })
                }
                if (_recordConfigSublist) {
                    _recordConfigSublist?.forEach(_sublist => {
                        const sublist = form.getSublist({ id: _sublist.sublist })
                        if (!sublist) return
                        _sublist?.columns?.forEach(_column => {
                            if (!_column.modes.includes(type)) return
                            const field = sublist.getField({ id: _column?.fieldid })
                            if (field) {
                                field.updateDisplayType({ displayType: _column?.displayOption })
                                if (_column["isMandatory"]) field.isMandatory = _column?.isMandatory
                            }
                        })
                    })
                }
            } catch (error) {
                throw new Error(`${FN} - ${error.message || 'Unexpected error'}`)
            }
        }

        const buttonsLogic = ({ buttonsCFG, form, newRecord, type }) => {
            const FN = `${FILE_NAME} -> buttonsLogic`
            try {
                buttonsCFG?.buttonsList?.forEach(_button => {
                    if (!_button?.modes?.includes(type)) return
                    let pass = true
                    if (_button.hasOwnProperty('hiddenValidator')) {
                        pass = validateConditions({ conditions: _button?.hiddenValidator?.conditions, _record: newRecord })
                    }
                    if (!pass) {
                        form.removeButton({ id: _button.id })
                        return
                    }
                    if (buttonsCFG?.script) {
                        if (!/^[A-Za-z_$][\w$]*$/.test(_button.function)) return
                        form.addButton({
                            id: _button.id,
                            label: _button.label,
                            functionName: `${_button.function}()`
                        })
                        form.clientScriptModulePath = buttonsCFG.script
                    }
                })
            } catch (error) {
                throw new Error(`${FN} - ${error.message || 'Unexpected error'}`)
            }
        }

        const validateConditions = ({ conditions, _record }) => {
            const FN = `${FILE_NAME} -> validateConditions`
            try {
                if (conditions?.length) {
                    const evaluate = []
                    conditions?.forEach(_fieldCondition => {
                        const currentValue = _record.getValue({ fieldId: _fieldCondition?.fieldid })
                        log.debug('currentValue', currentValue)
                        if (['string', 'number', 'boolean'].includes(typeof _fieldCondition?.value)) {
                            if (typeof _fieldCondition?.value == 'string') {
                                const isFunction = _fieldCondition?.value.includes("{FN}_")
                                log.debug('isFunction', isFunction)
                                if (isFunction) {
                                    const functionToCall = _fieldCondition?.value.split("{FN}_")[1]
                                    log.debug('functionToCall', functionToCall)
                                    const functionResult = libFieldFunctions.callFunction(functionToCall, { _record })
                                    log.debug('functionResult', functionResult)
                                    evaluate.push(functionResult)
                                } else {
                                    evaluate.push(currentValue == _fieldCondition?.value)
                                }
                            } else {
                                evaluate.push(currentValue == _fieldCondition?.value)
                            }
                        } else if (Array.isArray(_fieldCondition?.value)) {
                            evaluate.push(_fieldCondition?.value?.includes(currentValue))
                        }
                    })
                    log.debug('enabledCondition', evaluate)
                    return evaluate.every(_field => _field === true)
                }
                return false
            } catch (error) {
                throw new Error(`${FN} - ${error.message || 'Unexpected error'}`)
            }
        }

        return {
            triggerNestedAction,
            recordHandler
        }
    })