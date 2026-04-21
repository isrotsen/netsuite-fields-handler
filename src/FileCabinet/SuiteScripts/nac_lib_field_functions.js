/**
 * @NApiVersion 2.1
 * Date                Author                                             Remarks
 * 16 Apr 2026         Nestor Avila <development@nestoravila.net>          - Init
 */

define([],
    () => {

        const functionList = {
        }

        const callFunction = (functionName, params) => {
            const FN = 'callFunction'
            try {
                log.debug('functionName', functionName)
                const fn = functionList[functionName]
                if (typeof fn !== 'function') {
                    throw new Error(`Function '${functionName}' is not registered in functionList`)
                }
                return fn(params)
            } catch (error) {
                throw new Error(`${FN} - ${error.message || 'Unexpected error'}`)
            }
        }

        return {
            callFunction
        }
    })