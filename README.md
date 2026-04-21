# NetSuite Fields Handler

A NetSuite framework that lets you **change the behavior of a form** (which fields are visible, which ones can be edited, which buttons appear) **without touching code**. Everything is controlled from a JSON file stored in the File Cabinet.

---

## Who is this for?

Functional administrators and consultants who want to define dynamic rules over a record — for example: "show this field only when the user checks a certain checkbox", "make this other field mandatory in edit mode", "add a button that only appears under certain conditions" — **without asking a developer to edit a script every time**.

If tomorrow you want to change the behavior, **you edit the JSON and save**. No code is touched, no script is redeployed.

---

## How it works at a high level

1. You have a **JSON file** in the `SuiteScripts` folder of the File Cabinet with your rules.
2. A **UserEvent script** runs when someone opens the record in NetSuite, reads the JSON, and applies the initial rules (show/hide fields, labels, buttons).
3. A **ClientScript** runs while the user fills out the form and applies dynamic rules (enable field B when X is selected in field A).
4. A **RESTlet** serves the JSON to the ClientScript (browser scripts cannot read directly from the File Cabinet).

All the code is **generic** — the same script is reused for any record you want to configure.

---

## Project files

| File | What it is | Do you touch it? |
|---|---|---|
| `nac_json_fields_handler.json` | **Your rules file**. All the configuration lives here. | ✅ Yes, this is where you work |
| `nac_ue_fields_handler.js` | UserEvent that applies the rules when loading the record | ❌ No |
| `nac_cs_fields_handler.js` | ClientScript that applies rules live | ❌ No |
| `nac_rl_file_configuration.js` | RESTlet that serves the JSON | ❌ No |
| `nac_lib_*.js` | Shared libraries | ❌ No |
| `nac_cs_example_button.js` | Example ClientScript for a button | ✅ If you add buttons with their own logic |
| `sweetalert2.all.js` | Library for pretty alerts | ❌ No |

---

## Initial setup (first time only)

1. **Deploy the SDF project** to your NetSuite account (`suitecloud project:deploy`). This uploads:
   - The scripts to the File Cabinet (`/SuiteScripts/`).
   - The example custom record (`customrecord_nac_example`).
   - The 3 Script records with their deployments.

2. **Upload the JSON** to the File Cabinet at `/SuiteScripts/` with the name `nac_json_fields_handler.json` (or whatever you prefer — it must start with `nac_` and end with `.json`).

3. **Configure the deployment parameters** in NetSuite:
   - **NAC UE Fields Handler** → parameter *JSON Config File Name* = `nac_json_fields_handler.json`.
   - **NAC CS Fields Handler** → parameter *JSON Config File Name* = `nac_json_fields_handler.json`.
   - **NAC CS Fields Handler** → parameter *RESTlet Deployment Id* = `customdeploy_nac_rl_file_configuration`.

4. **Associate the deployments with each record** you want to configure. The UE and CS come associated with `customrecord_nac_example` as an example; you can add more deployments pointing to other records.

---

## General JSON structure

```json
{
  "VERSION": 1.0,

  "customrecord_my_record": {
    "header": { ... },
    "sublists": { ... },
    "fieldList": [ ... ],
    "nestedEnabledActionByForm": { ... },
    "buttonsCFG": { ... }
  },

  "salesorder": {
    "header": { ... }
  }
}
```

- **`VERSION`**: file version (informational).
- **Top-level keys** (`customrecord_my_record`, `salesorder`, etc.): these are the **internal IDs** of the record type the rules apply to. You can add as many as you want in the same JSON. It supports custom records (`customrecord_*`) and standard records (`salesorder`, `invoice`, `customer`, etc.).

Each record has 5 optional blocks. You can use only the ones you need.

---

## Block: `header`

Rules about the fields in the **header** (the fields at the top of the form, not the sublists).

```json
"header": {
  "*": [
    {
      "fieldid": "custrecord_customer",
      "modes": ["create", "edit"],
      "displayOption": "DISABLED",
      "isMandatory": true
    }
  ],
  "123": [
    {
      "fieldid": "custrecord_discount",
      "modes": ["edit"],
      "displayOption": "HIDDEN"
    }
  ]
}
```

**The inner key** (`"*"`, `"123"`) is the **ID of the custom form** the rule applies to:
- `"*"` means "for all forms".
- `"123"` means "only when the form with internal ID 123 is used".
- If a specific entry exists for the form, that one is used; otherwise it falls back to `"*"`.

Inside, each object in the array configures a field:

| Property | What it does | Expected value |
|---|---|---|
| `fieldid` | Internal ID of the field to control | string (e.g., `"custrecord_customer"`) |
| `modes` | Which modes the rule applies to | array of `"create"`, `"edit"`, `"copy"`, `"view"` |
| `displayOption` | How the field is displayed | `"NORMAL"`, `"DISABLED"`, `"HIDDEN"`, `"INLINE"` |
| `isMandatory` *(optional)* | Force the field to be mandatory | `true` / `false` |
| `conditions` *(optional)* | Conditions that must be met for the rule to apply | see [Conditions](#conditions) |
| `valuesTrigger` *(optional)* | Values that "trigger" enabling other fields | array of numbers or boolean |
| `fieldsForEnabling` *(optional)* | Fields that get enabled when the trigger is met | array of strings (field ids) |

**Example with trigger:**
```json
{
  "fieldid": "custrecord_has_discount",
  "modes": ["create", "edit"],
  "displayOption": "NORMAL",
  "valuesTrigger": true,
  "fieldsForEnabling": ["custrecord_discount_percentage", "custrecord_discount_reason"]
}
```
Translation: "If the `custrecord_has_discount` checkbox is checked, enable the percentage and reason fields."

---

## Block: `sublists`

Rules about the **columns of sublists** (the tables that appear inside a record, like "Items" in a Sales Order).

```json
"sublists": {
  "*": [
    {
      "sublist": "item",
      "columns": [
        {
          "fieldid": "quantity",
          "modes": ["create", "edit"],
          "displayOption": "NORMAL",
          "isMandatory": true
        },
        {
          "fieldid": "rate",
          "modes": ["edit"],
          "displayOption": "DISABLED"
        }
      ]
    }
  ]
}
```

- `sublist`: internal ID of the sublist (`"item"`, `"addressbook"`, etc.).
- `columns`: array of columns to configure, with the same properties as a header field (`fieldid`, `modes`, `displayOption`, `isMandatory`).

---

## Block: `fieldList`

A **flat** array with the IDs of all the fields that participate in the cascading enable logic. It is used so that, when a field loses its value, all other related fields can be disabled.

```json
"fieldList": [
  "custrecord_country",
  "custrecord_state",
  "custrecord_city",
  "custrecord_zip_code"
]
```

If you don't use `nestedEnabledActionByForm`, you can omit this block.

---

## Block: `nestedEnabledActionByForm`

The most powerful one: it defines **cascading rules** in the ClientScript (live while the user edits). Classic example: country → state → city.

```json
"nestedEnabledActionByForm": {
  "*": {
    "custrecord_country": [
      {
        "valuesTrigger": [1, 2],
        "modes": ["create", "edit"],
        "fieldsForEnabling": ["custrecord_state"]
      }
    ],
    "custrecord_state": [
      {
        "valuesTrigger": [10, 11, 12],
        "modes": ["create", "edit"],
        "fieldsForEnabling": ["custrecord_city"]
      }
    ]
  }
}
```

**Translation:**
- The outer key (`"*"` or form ID) works the same as in `header`: specific or fallback to `"*"`.
- For each **trigger field** (`custrecord_country`), you define an array of actions:
  - `valuesTrigger`: list of values that trigger the action. For list/select fields they are **numbers** (the internal ID of the option); for checkboxes it is `true` / `false`.
  - `modes`: which modes it is evaluated in.
  - `fieldsForEnabling`: fields that are enabled if the trigger is met.

**Flow:**
1. The user changes `custrecord_country`.
2. If the new value is in `[1, 2]`, `custrecord_state` is enabled.
3. If they then change `custrecord_state` to a value in `[10, 11, 12]`, `custrecord_city` is enabled.
4. If they clear `custrecord_country`, state and city are automatically disabled (and their values cleared).

---

## Block: `buttonsCFG`

Add custom buttons that appear on the form, typically in `view` mode.

```json
"buttonsCFG": {
  "script": "./nac_cs_example_button",
  "buttonsList": [
    {
      "modes": ["view"],
      "id": "custpage_btn_do_action",
      "function": "doAction",
      "label": "Do Action",
      "hiddenValidator": {
        "conditions": [
          {
            "fieldid": "custrecord_nac_example_processed",
            "value": true
          },
          {
            "fieldid": "custrecord_nac_example_completed",
            "value": false
          }
        ]
      }
    }
  ]
}
```

| Property | What it does | Expected value |
|---|---|---|
| `script` | Path to the ClientScript that contains the button functions (relative to the JSON) | string (e.g., `"./nac_cs_example_button"`) |
| `buttonsList` | Array of buttons | array |
| `modes` | Which modes the button appears in | `["view"]`, `["edit"]`, etc. |
| `id` | Internal ID of the button (must start with `custpage_`) | string |
| `function` | Name of the CS function that runs on click | string (e.g., `"doAction"`) |
| `label` | Text the user sees | string |
| `hiddenValidator.conditions` *(optional)* | Conditions that must be met to **show** the button. If not met, the button does not appear. | see [Conditions](#conditions) |

> ⚠️ If you omit `hiddenValidator`, the button is always shown (as long as `modes` matches).

### How to write the button function

The button **receives no parameters**. The function in the CS reads the values it needs directly from the current record:

```js
define(['N/currentRecord', './sweetalert2.all.js'], (currentRecord, Swal) => {

    const doAction = () => {
        const record = currentRecord.get()
        const processed = record.getValue({ fieldId: 'custrecord_nac_example_processed' })

        // your logic here...

        Swal.fire({ icon: 'info', title: 'OK', text: 'Action executed' })
    }

    return { pageInit: () => {}, doAction }
})
```

See `nac_cs_example_button.js` for a complete example.

---

## Conditions

Several blocks support a `conditions` section. It is an array of conditions that must **all** be met (AND) for the rule to apply.

```json
"conditions": [
  { "fieldid": "custrecord_status", "value": "approved" },
  { "fieldid": "custrecord_total", "value": [100, 200, 300] },
  { "fieldid": "custrecord_active", "value": true }
]
```

| `value` type | What it evaluates |
|---|---|
| `string` / `number` / `boolean` | Equality (`field == value`) |
| `array` | The field value must be included in the array |
| `"{FN}_myFunction"` (special string) | Calls a custom function registered in `nac_lib_field_functions.js` |

---

## Modes

Modes describe which form "state" a rule applies to:

| Value | When |
|---|---|
| `"create"` | When creating a new record |
| `"copy"` | When copying an existing record |
| `"edit"` | When editing an existing record |
| `"view"` | When viewing (read mode) |
| `"*"` | All modes (only in the form-level keys) |

You must always include `modes` as an array, even if it is just one: `"modes": ["edit"]`.

---

## Display options (`displayOption`)

Standard NetSuite values:

| Value | Effect |
|---|---|
| `"NORMAL"` | Editable (default value) |
| `"DISABLED"` | Shown but not editable |
| `"HIDDEN"` | Not shown at all |
| `"INLINE"` | Text only, without editable field border |

---

## Complete annotated example

```json
{
  "VERSION": 1.0,

  "customrecord_nac_example": {

    "header": {
      "*": [
        {
          "fieldid": "custrecord_nac_example_processed",
          "modes": ["create", "edit"],
          "displayOption": "NORMAL",
          "valuesTrigger": true,
          "fieldsForEnabling": ["custrecord_nac_example_completed"]
        }
      ]
    },

    "fieldList": [
      "custrecord_nac_example_processed",
      "custrecord_nac_example_completed"
    ],

    "nestedEnabledActionByForm": {
      "*": {
        "custrecord_nac_example_processed": [
          {
            "valuesTrigger": [true],
            "modes": ["create", "edit"],
            "fieldsForEnabling": ["custrecord_nac_example_completed"]
          }
        ]
      }
    },

    "buttonsCFG": {
      "script": "./nac_cs_example_button",
      "buttonsList": [
        {
          "modes": ["view"],
          "id": "custpage_btn_do_action",
          "function": "doAction",
          "label": "Do Action",
          "hiddenValidator": {
            "conditions": [
              { "fieldid": "custrecord_nac_example_processed", "value": true },
              { "fieldid": "custrecord_nac_example_completed", "value": false }
            ]
          }
        }
      ]
    }
  }
}
```

**What this example does, in simple words:**
- On the `customrecord_nac_example` record, on any form.
- On create/edit: the "Processed" checkbox can be checked; when it is, "Completed" is enabled.
- In view mode: if "Processed" is checked and "Completed" is not, a "Do Action" button appears. Otherwise, the button is not shown.

---

## Tips and common mistakes

- **Field IDs are case-sensitive.** Copy the exact IDs from NetSuite (you can see them in the URL when you edit a field or in the *Internal ID* of the field list).
- **`valuesTrigger` for list-type fields are numeric** (use the internal ID of the option, not the label).
- **The JSON must be valid.** A trailing comma or a misplaced quote will make nothing work. Validate your file at [jsonlint.com](https://jsonlint.com) before uploading it.
- **The file must be named `nac_*.json`** — the RESTlet blocks any other name for security reasons.
- **Changes to the JSON are immediate.** Just upload the new file to the File Cabinet overwriting the previous one; no need to redeploy scripts.
- **If nothing happens**, check the UserEvent and CS logs in NetSuite (*Customization > Scripting > Script Execution Log*).

---

## Quick glossary

| Term | Meaning |
|---|---|
| **Record** | An entity in NetSuite (customer, order, custom record, etc.) |
| **Field ID** | Unique internal identifier of a field |
| **Form ID** | Identifier of the custom form (multiple forms can exist per record) |
| **SuiteScript** | NetSuite's scripting platform |
| **UserEvent** | Script that runs on the server when loading/saving a record |
| **ClientScript** | Script that runs in the browser while the user edits |
| **RESTlet** | HTTP endpoint that runs a script in NetSuite |
| **File Cabinet** | NetSuite's file system |
| **SDF** | SuiteCloud Development Framework — tool for deploying customizations |
