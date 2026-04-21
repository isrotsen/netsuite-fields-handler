/**
 * @NApiVersion 2.1
 * Date                Author                                             Remarks
 * 21 Apr 2026         Nestor Avila <development@nestoravila.net>         - Init
 */

define([], () => {

    const MODES = {
        ALL: '*',
        CREATE: 'create',
        COPY: 'copy',
        EDIT: 'edit'
    }

    const SCRIPTS = {
        UE_FIELDS_HANDLER: {
            PARAMETERS: {
                JSON_FILE: 'custscript_nac_fh_json_cfg_file_name'
            }
        },
        CS_FIELDS_HANDLER: {
            PARAMETERS: {
                FILE_CFG: 'custscript_nac_cs_fh_file_cfg',
                FILE_NAME: 'custscript_nac_cs_fh_file_name'
            }
        },
        RL_CONFIGURATION: {
            ID: 'customscript_nac_rl_file_configuration'
        }
    }

    const RECORD_FIELDS = {
        BASE_RECORD_TYPE: 'baserecordtype',
        CUSTOM_FORM: 'customform'
    }

    const DISPLAY_TYPES = {
        NORMAL: 'NORMAL'
    }

    return {
        MODES,
        SCRIPTS,
        RECORD_FIELDS,
        DISPLAY_TYPES
    }
})
