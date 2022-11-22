/***
* @description  Lightning controller to provide details about existing Mass Action configurations
*               and actually execute mass actions. It leverages actual logic implementation provided
*               by child classes of the sfpegMassAction_SVC virtual class.
* @author       P-E GROS
* @date         Sep 2022
* @see sfpegMassAction_SVC
* @see PEG_CRMA package (https://github.com/pegros/PEG_CRMA)
*
* Legal Notice
* 
* MIT License
* 
* Copyright (c) 2022 pegros
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
***/

@SuppressWarnings('PMD.ClassNamingConventions')
public with sharing class sfpegMassAction_CTL {

    /***
    * @description  regex patterns to extract RT tokens.
    ***/
    static final Pattern RT_TOKEN_PATTERN = Pattern.compile('\\{\\{\\{RT.(\\w+).(\\w+)\\}\\}\\}');

    /***
    * @description  Simple method to fetch UI configuration details for a Mass Action component.
    *               It provides the way how the data table should be displayed and what
    *               controls and actions should be executed.
    *               This method automatically replaces RecordType merge tokens ('{{{RT.Object.Type}}}'
    *               in the JSON configuration properties if needed)
    * @param        actionName  DeveloperName of the sfpegMassAction configuration record
    * @return       Object      sfpegMassAction__mdt record with DisplayConfig__c, ControlConfig__c,
    *                           ActionConfig__c and MasterLabel fields filled in.
    * @exception    AuraHandledException    Raised if no configuration found for the provided name
    ***/
    @AuraEnabled(cacheable=true)
    public static Object getConfiguration(final String actionName) {
        System.debug(LoggingLevel.FINE,'getConfiguration: START with sfpegMassAction configuration name ' + actionName);

        sfpegMassAction__mdt actionConfig;
        try {
            actionConfig = [    SELECT  MasterLabel, Permission__c,
                                        DisplayActions__c, DisplayConfig__c, DisplayContext__c,
                                        FilterToDo__c, FilterBatchSize__c, FilterTemplate__c,
                                        ActionLabel__c, ActionTitle__c, ActionMessage__c, ActionForm__c, ActionBatchSize__c, ActionTemplate__c
                                FROM sfpegMassAction__mdt
                                WHERE DeveloperName =  :actionName LIMIT 1];
        }
        catch (Exception e) {
            System.debug(LoggingLevel.WARN,'getConfiguration: exception raised upon metadata fetch ' + e.getMessage());
            System.debug(LoggingLevel.ERROR,'getConfiguration: END - Missing/wrong configuration name ' + actionName);
            throw new AuraHandledException('Mass Action configuration not found with name ' + actionName);
        }

        if (actionConfig.Permission__c != null){
            if (!FeatureManagement.checkPermission(actionConfig.Permission__c)) {
                System.debug(LoggingLevel.ERROR,'getConfiguration: END - user has not custom permission required, i.e. ' + actionConfig.Permission__c);
                throw new AuraHandledException(String.format(System.Label.sfpegMassActionNoPermissionError, new List<Object>{actionConfig.Permission__c }));
            }
            System.debug(LoggingLevel.FINE,'getConfiguration: user has required custom permission, i.e. ' + actionConfig.Permission__c);
        }

        try {
            if ((actionConfig.DisplayActions__c != null) && (actionConfig.DisplayActions__c.contains('{{{RT.'))) {
                System.debug(LoggingLevel.FINE,'getConfiguration: replacing RT tokens in Display Actions');
                actionConfig.DisplayActions__c = replaceRTtokens(actionConfig.DisplayActions__c);
            }
            if ((actionConfig.DisplayContext__c != null) && (actionConfig.DisplayContext__c.contains('{{{RT.'))) {
                System.debug(LoggingLevel.FINE,'getConfiguration: replacing RT tokens in Display Context');
                actionConfig.DisplayContext__c = replaceRTtokens(actionConfig.DisplayContext__c);
            }
            if ((actionConfig.ActionForm__c != null) && (actionConfig.ActionForm__c.contains('{{{RT.'))) {
                System.debug(LoggingLevel.FINE,'getConfiguration: replacing RT tokens in Action Form');
                actionConfig.ActionForm__c = replaceRTtokens(actionConfig.ActionForm__c);
            }
            if ((actionConfig.ActionTemplate__c != null) && (actionConfig.ActionTemplate__c.contains('{{{RT.'))) {
                System.debug(LoggingLevel.FINE,'getConfiguration: replacing RT tokens in Action Template');
                actionConfig.ActionTemplate__c = replaceRTtokens(actionConfig.ActionTemplate__c);
            }
        }
        catch (Exception e) {
            System.debug(LoggingLevel.WARN,'getConfiguration: exception raised upon metadata rework ' + e.getMessage());
            System.debug(LoggingLevel.ERROR,'getConfiguration: END - Wrong metadata for configuration ' + actionName);
            throw new AuraHandledException('Invalid Mass Action configuration with name ' + actionName);
        }

        System.debug(LoggingLevel.FINE,'getConfiguration: END returning ' + actionConfig.MasterLabel);
        return (Object) (actionConfig);
    }

    /***
    * @description  Method to filter the rows provided as input to the Mass Action component to keep only
    *               those actually eligible to the action.
    *               It should return the rows to be removed from the input list by the
    *               Mass Action component prior to executing the action.
    * @param        actionName      DeveloperName of the sfpegMassAction configuration record.
    * @param        rows            List of rows to be filtered.
    * @param        context         Display context data.
    * @return       List<Object>    List of rows matching the filter.
    * @exception    AuraHandledException    Raised if no configuration found for the provided name.
    ***/
    @AuraEnabled
    public static List<Object> filterRows(final String actionName, final List<Object> rows, final Object context) {
        System.debug(LoggingLevel.FINE,'filterRows: START with sfpegMassAction name ' + actionName);
        System.debug(LoggingLevel.FINE,'filterRows: and #rows ' + rows?.size());

        sfpegMassAction__mdt actionConfig;
        try {
            actionConfig = [    SELECT MasterLabel, FilterToDo__c, FilterClass__c, FilterConfig__c
                                FROM sfpegMassAction__mdt
                                WHERE DeveloperName =  :actionName LIMIT 1];
        }
        catch (Exception e) {
            System.debug(LoggingLevel.WARN,'filterRows: exception raised upon metadata fetch ' + e.getMessage());
            System.debug(LoggingLevel.ERROR,'filterRows: END - Missing/wrong configuration name ' + actionName);
            throw new AuraHandledException('Mass Action configuration not found with name ' + actionName);
        }

        if (!actionConfig.FilterToDo__c) {
            System.debug(LoggingLevel.ERROR,'filterRows: END - no filtering to do for action ' + actionName);
            throw new AuraHandledException('No filtering to do for action ' + actionName);
        }
        System.debug(LoggingLevel.FINE,'filterRows: control configuration fetched ' + actionConfig);

        Type filterClass = Type.forName(actionConfig.FilterClass__c);
        if (null == filterClass) {
            System.debug(LoggingLevel.ERROR,'filterRows: END - Filter Apex class (' + actionConfig.FilterClass__c + ') not found  for action ' + actionName);
            throw new AuraHandledException('Filter Apex class (' + actionConfig.FilterClass__c + ') not found  for action ' + actionName);
        }
        System.debug('filterRows: Filter Apex class found with name ' + actionConfig.FilterClass__c);
        sfpegMassAction_SVC filterInstance = (sfpegMassAction_SVC) filterClass.newInstance();

        List<Object> filteredRows = filterInstance.filterRows(actionConfig.FilterConfig__c, rows, context);
        System.debug(LoggingLevel.FINE,'filterRows: END returning #rows ' + filteredRows?.size());
        return filteredRows;
    }

    /***
    * @description  Method to execute the action on the rows provided as input to the Mass Action component.
    * @param        actionName      DeveloperName of the sfpegMassAction configuration record.
    * @param        rows            List of rows to be filtered.
    * @param        context         Display context data.
    * @return       List<sfpegMassAction_SVC.ActionResult> Result of the row processing.
    * @exception    AuraHandledException    Raised if no configuration found for the provided name.
    ***/
    @AuraEnabled
    public static List<sfpegMassAction_SVC.ActionResult> executeAction(final String actionName, final List<SObject> rows, final Object context) {
        System.debug(LoggingLevel.FINE,'executeAction: START with sfpegMassAction name ' + actionName);
        System.debug(LoggingLevel.FINE,'executeAction: and #rows ' + rows?.size());

        sfpegMassAction__mdt actionConfig;
        try {
            actionConfig = [    SELECT MasterLabel, ActionClass__c, ActionConfig__c
                                FROM sfpegMassAction__mdt
                                WHERE DeveloperName =  :actionName LIMIT 1];
        }
        catch (Exception e) {
            System.debug(LoggingLevel.WARN,'executeAction: exception raised upon metadata fetch ' + e.getMessage());
            System.debug(LoggingLevel.ERROR,'executeAction: END - Missing/wrong configuration name ' + actionName);
            throw new AuraHandledException('Mass Action configuration not found with name ' + actionName);
        }
        System.debug(LoggingLevel.FINE,'executeAction: action configuration fetched ' + actionConfig);

        Type actionClass = Type.forName(actionConfig.ActionClass__c);
        if (null == actionClass) {
            System.debug(LoggingLevel.ERROR,'executeAction: END - Action Apex class (' + actionConfig.ActionClass__c + ') not found  for action ' + actionName);
            throw new AuraHandledException('Action Apex class (' + actionConfig.ActionClass__c + ') not found  for action ' + actionName);
        }
        System.debug('executeAction: Action Apex class found with name ' + actionConfig.ActionClass__c);
        sfpegMassAction_SVC actionInstance = (sfpegMassAction_SVC) actionClass.newInstance();

        List<sfpegMassAction_SVC.ActionResult> actionResults = actionInstance.executeAction(actionConfig.ActionConfig__c, rows, context);
        System.debug(LoggingLevel.FINE,'executeAction: END returning ' + actionResults);
        return actionResults;
    }

    /***
    * @description  Utility method to replace all RecordType tokens (as '{{{RT.<ObjectApiName>.<RTDevName>}}}') in a string
    *               and replace them with their ID.
    * @param        template    Template string containing RT tokens to be merged
    * @return       String      Same string as template with all RT tokens replaced by the proper IDs.
    ***/
    @TestVisible 
    private static String replaceRTtokens(final String template) {
        System.debug('replaceRTtokens: START with ' + template);

        String result = template;
        Matcher tokenMatcher = RT_TOKEN_PATTERN.matcher(template);
        while (tokenMatcher.find()) {
            System.debug(LoggingLevel.FINE,'replaceRTtokens: processing match ' + tokenMatcher.group(0));

            System.debug(LoggingLevel.FINE,'replaceRTtokens: Object API name is ' + tokenMatcher.group(1));
            System.debug(LoggingLevel.FINE,'replaceRTtokens: RT dev name is ' + tokenMatcher.group(2));

            Schema.RecordTypeInfo rtDesc = Schema.getGlobalDescribe().get(tokenMatcher.group(1))?.getDescribe()?.getRecordTypeInfosByDeveloperName()?.get(tokenMatcher.group(2));
            System.debug(LoggingLevel.FINE,'replaceRTtokens: RT desc fetched ' + rtDesc);

            if (rtDesc == null) {
                System.debug(LoggingLevel.ERROR,'replaceRTtokens: END KO / RT desc not found for ' + tokenMatcher.group(0));
                throw new StringException('Unknown Record Type Token configured ! --> ' + tokenMatcher.group(0));
            }
            result = result.replace(tokenMatcher.group(0), rtDesc.getRecordTypeId());
        }
        System.debug('replaceRTtokens: END OK / all RT tokens replaced ' + result);
        return result;
    }
}