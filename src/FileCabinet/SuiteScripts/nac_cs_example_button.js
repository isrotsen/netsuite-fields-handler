/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * @description Example ClientScript attached to buttons configured via
 *              buttonsCFG in the JSON. Demonstrates the Option C pattern:
 *              button handlers read values directly from currentRecord
 *              instead of receiving them as interpolated params.
 *
 * Date                Author                                             Remarks
 * 21 Apr 2026         Nestor Avila <development@nestoravila.net>          - Init
 */
define(['N/currentRecord', './sweetalert2.all.js'],
    (currentRecord, Swal) => {

        const FILE_NAME = 'nac_cs_example_button'

        const pageInit = () => {
            const FN = `${FILE_NAME} -> pageInit`
            try {
                window.onbeforeunload = null
            } catch (error) {
                console.error(`${FN} - ${error.message || 'Unexpected error'}`)
            }
        }

        const doAction = () => {
            const FN = `${FILE_NAME} -> doAction`
            try {
                const record = currentRecord.get()
                const processed = record.getValue({ fieldId: 'custrecord_nac_example_processed' })
                const completed = record.getValue({ fieldId: 'custrecord_nac_example_completed' })

                Swal.fire({
                    icon: 'info',
                    title: 'Do Action',
                    html: `processed: <b>${processed}</b><br>completed: <b>${completed}</b>`
                })
            } catch (error) {
                const msg = `${FN} - ${error.message || 'Unexpected error'}`
                console.error(msg)
                Swal.fire({ icon: 'error', title: 'OOPS!', text: msg })
            }
        }

        return {
            pageInit,
            doAction
        }
    })
