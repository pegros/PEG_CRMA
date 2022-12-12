/***
* @author       P-E GROS
* @date         Sep 2022
* @description  Standard implementation of the generic sfpegMassAction_SVC class providing 
*               out of the box SOQL based filtering and DML based mass action execution.
* @see          sfpegMassAction_CTL
* @see          sfpegMassAction_SVC
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
public with sharing class sfpegMassActionSoqlDml_SVC extends sfpegMassAction_SVC {

    /***
    * @description  regex patterns to extract supported tokens.
    ***/
    static final Pattern TOKEN_PATTERN = Pattern.compile('\\{\\{\\{([A-Z]{3}.)?(\\w+)\\}\\}\\}');

    /***
    * @description          Overriden filter method implementing a simple SOQL based logic.
    * @param config         Filter configuration containing a SOQL query 
    * @param rows           List of rows to be filtered.
    * @param context        Display context data provided by the component
    * @return List<Object>  List of rows matching the filter
    * @exception AuraHandledException   Returned systematically by default with a warning message
    *                                   to inform that real implementation is not available.
    ***/
    public override List<Object> filterRows(final String config, final List<Object> rows, final Object context) {
        System.debug('filterRows: START sfpegMassActionSoqlDml_SVC implementation');
        System.debug(LoggingLevel.FINE,'filterRows: config provided ' + config);
        System.debug(LoggingLevel.FINE,'filterRows: #rows provided ' + rows.size());
        System.debug(LoggingLevel.FINE,'filterRows: context provided ' + context);

        try {
            String soqlQuery = replaceTokens(config,rows,context);
            System.debug(LoggingLevel.FINE,'filterRows: filter SOQL query init ' + soqlQuery);

            List<Object> results = database.query(soqlQuery);
            System.debug(LoggingLevel.FINE,'filterRows: query executed ' + results);

            System.debug(LoggingLevel.FINE,'filterRows: END OK returning #items ' + results?.size());
            return results;
        }
        catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'executeAction : END KO / ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    /***
    * @description          Private utility method to replace tokens (e.g. "{{{CCC.yyyyy}}}") within a template.
    * @param template       String template containing tokens to be merged 
    * @param rows           List of rows to be used in {{{ROWS}}} or {{{ROW.xxx}}} tokens.
    * @param context        Context data to be used in  {{{CTX}}} or {{{CTX.xxx}}} tokens.
    * @return String        Template string with tokens merged.
    ***/
    @TestVisible 
    private String replaceTokens(final String template, final List<Object> rows, final Object context) {
        System.debug('replaceTokens: START');

        String result = template;
        //Pattern tokenPattern = Pattern.compile(TOKEN_PATTERN);
        Matcher tokenMatcher = TOKEN_PATTERN.matcher(template);
        while (tokenMatcher.find()) {
            System.debug(LoggingLevel.FINE,'replaceTokens: processing match ' + tokenMatcher.group(0));

            if (tokenMatcher.group(1) == null) {
                System.debug(LoggingLevel.FINE,'replaceTokens: processing root token ' + tokenMatcher.group(2));
                if (tokenMatcher.group(2) == 'ROWS') {
                    System.debug(LoggingLevel.FINE,'replaceTokens: replacing all rows ' + rows);
                    result = result.replace(tokenMatcher.group(0), '\'' + String.join(rows, '\', \'') + '\'');
                }
                else if (tokenMatcher.group(2) == 'CTX') {
                    System.debug(LoggingLevel.FINE,'replaceTokens: replacing bare context');
                    result = result.replace(tokenMatcher.group(0), (String)context);
                }
                else {
                    System.debug(LoggingLevel.ERROR,'replaceTokens: unknown token ' + tokenMatcher.group(2));
                }
            }
            else {
                if (tokenMatcher.group(1) == 'CTX.') {
                    System.debug(LoggingLevel.FINE,'replaceTokens: replacing context field ' + tokenMatcher.group(2));
                    Map<Object,Object> contextMap = (Map<Object,Object>) context;
                    String tokenValue = (String) contextMap?.get(tokenMatcher.group(2));
                    System.debug(LoggingLevel.FINE,'replaceTokens: token value fetched ' + tokenValue);
                    result = result.replace(tokenMatcher.group(0), tokenValue);
                }
                else if (tokenMatcher.group(1) == 'ROW.') {
                    System.debug(LoggingLevel.FINE,'replaceTokens: replacing row field ' + tokenMatcher.group(2));
                    Set<String> tokenValues = new Set<String>();
                    for (Object iter : rows) {
                        Map<Object,Object> iterMap = (Map<Object,Object>) iter;
                        String iterValue = (String) iterMap?.get(tokenMatcher.group(2));
                        tokenValues.add(iterValue);
                    }
                    System.debug(LoggingLevel.FINE,'replaceTokens: token values fetched ' + tokenValues);
                    List<String> tokenValueList = new List<String>(tokenValues);
                    result = result.replace(tokenMatcher.group(0), '\'' + String.join(tokenValueList,'\', \'') + '\'');
                }
                else {
                    System.debug(LoggingLevel.ERROR,'replaceTokens: unknown root token ' + tokenMatcher.group(1));
                }
            }
        }
        System.debug(LoggingLevel.FINE,'replaceLabelTokens: all tokens processed');

        System.debug('replaceLabelTokens: END returning ' + result);
        return result;
    }

    /***
    * @description          Overriden execute method implementing a simple DML based logic.
    * @param config         Action configuration as provided by the applicable sfpegMassAction record.
    *                       It should correspond to one of the supported DML operations,
    *                       i.e. 'insert', 'update' or 'delete' (in all-or-none mode)
    *                       or 'insertBE', 'updateBE' or 'deleteBE' (in best-effort mode)
    * @param rows           List of rows to be acted upon.
    * @param context        Display context data provided by the component (ignored)
    * @return String        Execution summary to be possibly displayed within the component
    * @exception AuraHandledException   Returned systematically by default with a warning message
    *                                   to inform that real implementation is not available.
    ***/
    public override List<sfpegMassAction_SVC.ActionResult> executeAction(final String config, final List<SObject> rows, final Object context) {
        System.debug('executeAction: START sfpegMassActionSoqlDml_SVC implementation');
        System.debug(LoggingLevel.FINE,'executeAction: config provided ' + config);
        System.debug(LoggingLevel.FINE,'executeAction: #rows provided ' + rows?.size());
        System.debug(LoggingLevel.FINE,'executeAction: context provided ' + context);

        System.debug(LoggingLevel.FINEST,'executeAction: rows provided ' + rows);

        try {
            switch on config {
                when 'insert' {
                    Database.SaveResult[] results = database.insert(rows, true);
                    System.debug('executeAction : END / rows inserted (all or none) ' + results);
                    return reworkResults(rows,results);
                }
                when 'insertBE' {
                    Database.SaveResult[] results = database.insert(rows, false);
                    System.debug('executeAction : END / inserting rows (best effort) ' + results);
                    return reworkResults(rows,results);
                }
                when 'update' {
                    Database.SaveResult[] results = database.update(rows, true);
                    System.debug('executeAction : END / updating rows (all or none)');
                    return reworkResults(rows,results);
                }
                when 'updateBE' {
                    Database.SaveResult[] results = database.update(rows, false);
                    System.debug('executeAction : END / updating rows (best effort)');
                    return reworkResults(rows,results);
                }
                when 'delete' {
                    List<Database.DeleteResult> results = database.delete(rows, true);
                    System.debug('executeAction : END / rows deleted (all or none) ' + results);
                    return reworkResults(rows,results);
                }
                when 'deleteBE' {
                    List<Database.DeleteResult> results = database.delete(rows, false);
                    System.debug('executeAction : END / deleting rows (best effort) ' + results);
                    return reworkResults(rows,results);
                }
                when else {
                    System.debug(LoggingLevel.WARN, 'executeAction : unsupported DML operation ' + config);
                    StringException  errInvalid = new StringException();
                    errInvalid.setMessage('Unknown or unsupported DML operation (' + config + ') requested!');
                    throw errInvalid;
                }
            }
        }
        catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'executeAction : END KO / ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    /***
    * @description          Private utility to rework insert or update results.
    * @param rows           List of rows to be acted upon.
    * @param results        List of insert/update operation results.
    * @return List<Object>  Execution summary to be returned to the component.
    ***/
    private List<sfpegMassAction_SVC.ActionResult> reworkResults(final List<SObject> rows, final List<Database.SaveResult> results) {
        System.debug('reworkResults: START (insert/update)');

        List<sfpegMassAction_SVC.ActionResult> resultList = new List<sfpegMassAction_SVC.ActionResult>();
        Integer index = 0;
        for (SObject iter : rows) {
            System.debug(LoggingLevel.FINEST,'reworkResults: processing item ' + iter);
            Database.SaveResult iterResult = results.get(index);
            System.debug(LoggingLevel.FINEST,'reworkResults: result fetched ' + iterResult);
            if (iterResult.isSuccess()) {
                iter.Id = iterResult.getId();
                //resultList.add(new sfpegMassAction_SVC.ActionResult(iter,true,'Processed','standard:approval','slds-text-color_success',null));
                resultList.add(new sfpegMassAction_SVC.ActionResult(iter,true,System.Label.sfpegMassActionStatusOK,'standard:approval','slds-text-color_success','OK insert/update'));
                System.debug(LoggingLevel.FINEST,'reworkResults: success row added with Id ' + iter.Id);
            }
            else {
                Database.Error[] iterErrors = iterResult.getErrors();
                String iterMessage = (iterErrors[0]).getMessage();
                resultList.add(new sfpegMassAction_SVC.ActionResult(iter,false,System.Label.sfpegMassActionStatusKO,'standard:incident','slds-text-color_error',iterMessage));
                System.debug(LoggingLevel.FINEST,'reworkResults: failed row added with error ' + iterMessage);
            }
            index += 1;
        }
        System.debug(LoggingLevel.FINE,'reworkResults: resultList init ' + resultList);

        System.debug('reworkResults: END with #results ' + resultList.size());
        return resultList;
    }

    /***
    * @description          Private utility to rework delete results.
    * @param rows           List of rows to be acted upon.
    * @param results        List of delete operation results.
    * @return List<Object>  Execution summary to be returned to the component.
    ***/
    private List<sfpegMassAction_SVC.ActionResult> reworkResults(final List<SObject> rows, final List<Database.DeleteResult> results) {
        System.debug('reworkResults: START (delete)');

        List<sfpegMassAction_SVC.ActionResult> resultList = new List<sfpegMassAction_SVC.ActionResult>();
        Integer index = 0;
        for (SObject iter : rows) {
            System.debug(LoggingLevel.FINEST,'reworkResults: processing item ' + iter);
            Database.DeleteResult iterResult = results.get(index);
            System.debug(LoggingLevel.FINEST,'reworkResults: result fetched ' + iterResult);
            if (iterResult.isSuccess()) {
                //resultList.add(new sfpegMassAction_SVC.ActionResult(iter,true,'Processed','standard:approval','slds-text-color_success',null));
                resultList.add(new sfpegMassAction_SVC.ActionResult(iter,true,System.Label.sfpegMassActionStatusOK,System.Label.sfpegMassActionIconOK,'slds-text-color_success','OK delete'));
                System.debug(LoggingLevel.FINEST,'reworkResults: success row added with Id ' + iter.Id);
            }
            else {
                Database.Error[] iterErrors = iterResult.getErrors();
                String iterMessage = (iterErrors[0]).getMessage();
                resultList.add(new sfpegMassAction_SVC.ActionResult(iter,false,System.Label.sfpegMassActionStatusKO,System.Label.sfpegMassActionIconKO,'slds-text-color_error',iterMessage));
                System.debug(LoggingLevel.FINEST,'reworkResults: failed row added with error ' + iterMessage);
            }
            index += 1;
        }
        System.debug(LoggingLevel.FINE,'reworkResults: resultList init ' + resultList);

        System.debug('reworkResults: END with #results ' + resultList.size());
        return resultList;
    }
}