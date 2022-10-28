---
# SFPEG Mass Action Component
---

## Introduction

This component displays an actionable data table within a CRM Analytics Dashboard, letting the
user remain in the Dashboard to execute a mass action on this result set.

It leverages the standard  **[slds-datatable](https://developer.salesforce.com/docs/component-library/bundle/lightning-datatable)** Lightning base component to display the list of values and provide various unitary/mass update, subfilters... on a copy of the input query results to trigger Apex actions with the resulting list.

![sfpegMassActionCmp in action](/media/sfpegMassAction.png)

When executing one of the proposed action, a form is presented to the user to ask for additional input and/or
confirmation before executing it.

![sfpegMassActionCmp interaction](/media/sfpegMassActionMainActionPopup.png)

Typical use case is to leverage a CRM Analytics Dashboard embedded within a Campaign Lightning record page to target Contacts to be added to it as CampaignMembers. This enables the user to remain within the Campaign page (no VF page redirection).

Other use cases are mass reassignment of Accounts to new Owners (with possibly complex filters provided in the Dashboard), mass creation of callback or escalation tasks on Opportunities or Cases... possibly amending information on the selected records before executing the operation.

**⚠️ This component is still in early beta state**. It works but has not been used yet on production environments.

### Main Action Processing

### Display (local) Action Processing


***

## Component Configuration

Configuration of this component is done at two levels:
* in the **Analytics Studio** Dashboard editor, mainly consisting in standard data **query** configuration
* via **sfpegMassAction** custom metadata records for display and action configuration

A standard / default **sfpegMassActionSoqlDml_SVC** Apex class is available to execute standard SOQL
based controls and DML (insert / update / delete) operations. If needed, custom filter / action logic
may be added in Apex (by implementing the **sfpegMassAction_SVC** virtual class interface) and used in
this configuration.

### **Analytics Studio** Configuration

After having selected the **SFPEG Mass Action** component in the Dashboard editor, 
the underlying Query needs to be configured first. It is possible to come back
any time to the query via the standard query editor action (shown in red below).

![sfpegMassActionCmp Query Configuration](/media/sfpegMassActionConfig1.png)

**Beware** to select at least one dimension uniquely identifying the rows to be
displayed in the data table. Otherwise row selection will fail when using the
component if duplicates are found !

This unique key dimension must then be set in the `Key Field`property when
opening the _Component Attributes_ (shown in blue below).

![sfpegMassActionCmp Component Configuration](/media/sfpegMassActionConfig2.png)

The second most important property is then `Configuration` which should provide
the Developer Name of the **sfpegMassAction** metadata record providing the 
most detailed configuration.

Other properties enable to:
* set a title content and size 
* provide contextual information about a specific record, e.g. leveraging
dynamic bindings to provide the Object Name and record ID of a selected 
record elsewhere in the Dashboard or of the page record when embedding the
Dashboard in a Lightning record page.
* activate debug logs in the console
### **Metadata** Configuration

Most of the detailed configuration is done in **sfpegMassAction** custom
metadata records.

![sfpegMassActionCmp Metadata Configuration](/media/sfpegMassActionConfigMeta.png)

to be completed....
### Apex Logic Extension

to be completed


***

## Technical Details

to be completed
