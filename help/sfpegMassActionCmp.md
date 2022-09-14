---
# SFPEG Mass Action Component
---

## Introduction

This component displays an actionable list within a CRM Analytics Dashboard, letting the
user remain in the Dashboard to execute a mass action on this result set.

It leverages the standard  **[slds-datatable](https://developer.salesforce.com/docs/component-library/bundle/lightning-datatable)** Lightning base component to display the list of values and provide various unitary/mass update, subfilters... on a copy of the input query results to trigger Apex actions with the resulting list.

Typical use case is to leverage a CRM Analytics Dashboard embedded within a Campaign Lightning record page to target Contacts to be added to it as CampaignMembers. This enables the user to remain within the Campaign page (no VF page redirection).

Other use cases are mass reassignment of Accounts to new Owners (with possibly complex filters provided in the Dashboard), mass creation of callback or escalation tasks on Opportunities or Cases... possibly amending information on the selected records before executing the operation.

**This component is still in early beta state.** It works but is still not fully tested in real 
production environments.

***

## Component Configuration

It mainly relies on the **sfpegMassAction** custom metadata for configuration.
to be completed


***

## Technical Details

to be completed
