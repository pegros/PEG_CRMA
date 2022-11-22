/***
* @author       P-E GROS
* @date         Sep 2022
* @description  Virtual handling class used by the sfpegMassAction_CTL generic controller to
*               implement custom Apex mass actions. 
*               Provides virtual default implementations of supported methods.
*               Default implementation throws exceptions to warn about missing implementation.
* @see          sfpegMassAction_CTL
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
public virtual class sfpegMassAction_SVC {

    /***
    * @description  Method to provide an Apex row filtering logic implementation for the 
    *               sfpegMassAction_CTL generic controller class.
    *               It should return the rows to be removed from the input list by the
    *               Mass Action component prior to executing the action.
    * @param config         Filter configuration as provided by the applicable sfpegMassAction record.
    * @param rows           List of rows to be filtered.
    * @param context        Display context data provided by the component
    * @return List<Object>  List of rows matching the filter
    * @exception AuraHandledException   Returned systematically by default with a warning message
    *                                   to inform that real implementation is not available.
    ***/
    public virtual List<Object> filterRows(final String config, final List<Object> rows, final Object context) {
        System.debug(LoggingLevel.ERROR,'filterRows: sfpegMassAction_SVC default implementation called.');
        throw new AuraHandledException('Mass Action Apex filtering logic not implemented!');
    }

    /***
    * @description  Method to provide an Apex action execution logic implementation for the 
    *               sfpegMassAction_CTL generic controller class.
    * @param config         Action configuration as provided by the applicable sfpegMassAction record.
    * @param rows           List of rows to be acted upon.
    * @param context        Display context data provided by the component
    * @return sfpegMassAction_CTL.ActionResult   Result of the row processing.
    * @exception AuraHandledException   Returned systematically by default with a warning message
    *                                   to inform that real implementation is not available.
    ***/
    public virtual List<ActionResult> executeAction(final String config, final List<SObject> rows, final Object context) {
        System.debug(LoggingLevel.ERROR,'executeAction: sfpegMassAction_SVC default implementation called.');
        throw new AuraHandledException('Mass Action Apex action execution logic not implemented!');
    }

    /***
    * @description  Public structure to return execution results.
    ***/
    public class ActionResult {
    
        @AuraEnabled public Object  record  { get; set; }
        @AuraEnabled public Boolean isOK    { get; set; } // status qualification of the processing
        @AuraEnabled public String  status  { get; set; } // status value to be set on row
        @AuraEnabled public String  icon    { get; set; } // SLDS icon to illustrate status
        @AuraEnabled public String  color   { get; set; } // SLDS text class to colorise status 
        @AuraEnabled public String  message { get; set; } // detailed message for status (e.g. error details)

        public ActionResult(Object  record, Boolean isOK, String status, String  icon, String  color, String  message) {
            this.record = record;
            this.isOK = isOK;
            this.status = status;
            this.icon   = icon;
            this.color   = color;
            this.message = message;
            System.debug('ActionResult: input message ' + message);
            System.debug('ActionResult: stored message ' + this.message);
        }
        
        public ActionResult() {
        }
    }
}