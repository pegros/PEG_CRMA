/***
* @description Test class for the sfpegMassAction_CTL, sfpegMassAction_SVC and sfpegMassActionSoqlDml_SVC classes.
* @author      P-E GROS
* @date        Sept. 2022
* @see         sfpegMassAction_CTL
* @see         sfpegMassAction_SVC
* @see         sfpegMassActionSoqlDml_SVC
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

@isTest
@SuppressWarnings('PMD.ClassNamingConventions')
public class  sfpegMassAction_TST {

    /***
    * @description Initializes the test context.
    ***/
    @testSetup
    static void testSetup() {
        System.debug('testSetup: START');

        String currentUserId = UserInfo.getUserId();
        System.debug('testSetup: currentUserId fetched ' + currentUserId);

        Map<ID,PermissionSet> sfpegPSets = new Map<ID,PermissionSet>([SELECT Name FROM PermissionSet WHERE Name LIKE 'sfpeg%']);
        System.debug('testSetup: sfpegPSets fetched ' + sfpegPSets);

        List<PermissionSetAssignment> currentAssignments = [    select PermissionSetId from PermissionSetAssignment
                                                                where AssigneeId = :currentUserId and PermissionSetId in :sfpegPSets.keySet()];
        System.debug('testSetup: currentAssignments fetched ' + currentAssignments);
        for (PermissionSetAssignment iter : currentAssignments) {
            System.debug('testSetup: removing PermissionSet ' + iter.PermissionSetId);
            sfpegPSets.remove(iter.PermissionSetId);
        }
        System.debug('testSetup: sfpegPSets revised ' + sfpegPSets);

        List<PermissionSetAssignment> newAssignments = new List<PermissionSetAssignment>();
        for (PermissionSet iter : sfpegPSets.values()) {
            System.debug('testSetup: sfpegPSets processing PSet ' + iter);
            newAssignments.add(new PermissionSetAssignment(AssigneeId = currentUserId, PermissionSetId = iter.Id));
        }
        System.debug('testSetup: newAssignments init ' + newAssignments);

        insert newAssignments;
        System.debug('testSetup: newAssignments inserted ' + newAssignments);

        System.debug('testSetup: END');
    }

    /***
    * @description  Test method for the sfpegMassAction_CTL class, checking the "getConfiguration" method
    *               including all error cases. Uses the standard "SFPEG_TEST_xxx" sfpegMassAction__mdt metadata
    *               records to check all cases.
    * @see  sfpegAction_CTL
    ***/
    @isTest
    static void testGetConfiguration() {
        System.debug('testGetConfiguration: START');
        Test.startTest();

        // KO Cases
        try {
            sfpegMassAction_CTL.getConfiguration('sfpegTestDummy');
            System.debug(LoggingLevel.Error,'testGetConfiguration: TEST ERROR KO / no exception raised for invalid action name');
            System.assert(false,'testGetConfiguration: no exception raised for invalid action name');
        }
        catch (Exception e) {
            System.debug('testGetConfiguration: TEST ERROR OK / proper exception raised for invalid action name ' + e);
            System.assert(true,'testGetConfiguration: proper exception raised for invalid action name ' + e.getMessage());
        }

        try {
            sfpegMassAction_CTL.getConfiguration('sfpegTestNoPermission');
            System.debug(LoggingLevel.Error,'testGetConfiguration: TEST ERROR KO / no exception raised for action with no user access');
            System.assert(false,'testGetConfiguration: no exception raised for action with no user access');
        }
        catch (Exception e) {
            System.debug('testGetConfiguration: TEST ERROR OK / proper exception raised for action with no user access ' + e);
            System.assert(true,'testGetConfiguration: proper exception raised for action with no user access ' + e.getMessage());
        }

        try {
            sfpegMassAction_CTL.getConfiguration('sfpegTestConfigKO');
            System.debug(LoggingLevel.Error,'testGetConfiguration: TEST ERROR KO / no exception raised for action with invalid config');
            System.assert(false,'testGetConfiguration: no exception raised for action with invalid config');
        }
        catch (Exception e) {
            System.debug('testGetConfiguration: TEST ERROR OK / proper exception raised for action with invalid config ' + e);
            System.assert(true,'testGetConfiguration: proper exception raised for action with invalid config ' + e.getMessage());
        }

        // Standard OK Case
        try {
            Object actionDesc = sfpegMassAction_CTL.getConfiguration('sfpegTestSoqlDml');
            System.debug('testGetConfiguration: TEST SUCCESS OK / configuration for valid action found ' + actionDesc);
            System.assert(true,'testGetConfiguration: configuration for valid action found ' + actionDesc);
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testGetConfiguration: TEST SUCCESS KO / configuration for valid action not found ' + e);
            System.assert(false,'testGetConfiguration: configuration for avlid action not found ' + e.getMessage());
        }

        Test.stopTest();
		System.debug('testGetConfiguration: END');
    }


    /***
    * @description  Test method for the sfpegAction_CTL class, checking the "filterRows" method
    *               which also involves the sfpegAction_SVC and sfpegMassActionSoqlDml_SVC classes.
    * @see  sfpegMassAction_CTL
    * @see  sfpegMassAction_SVC
    * @see  sfpegMassActionSoqlDml_SVC
    ***/

    @isTest
    static void testFilterRows() {
        System.debug('testFilterRows: START');
        Test.startTest();

        // KO Cases
        try {
            sfpegMassAction_CTL.filterRows('sfpegTestDummy', null, null);
            System.debug(LoggingLevel.Error,'testFilterRows: TEST ERROR KO / no error raised for unknown configuration');
            System.assert(false,'testFilterRows: no error raised for unknown configuration');
        }
        catch (Exception e) {
            System.debug('testExecuteApex: TEST ERROR OK / error properly raised for unknown configuration' + e.getMessage());
            System.assert(true,'testExecuteApex: error properly raised for unknown configuration' + e.getMessage());
        }

        try {
            sfpegMassAction_CTL.filterRows('sfpegTestNoFilterDummyAction', null, null);
            System.debug(LoggingLevel.Error,'testFilterRows: TEST ERROR KO / no error raised for no filter action configuration');
            System.assert(false,'testFilterRows: no error raised for no filter action configuration');
        }
        catch (Exception e) {
            System.debug('testFilterRows: TEST ERROR OK / error properly raised for no filter action configuration ' + e.getMessage());
            System.assert(true,'testFilterRows: error properly raised for no filter action configuration ' + e.getMessage());
        }

        try {
            sfpegMassAction_CTL.filterRows('sfpegTestNoFilterClassDummyAction', null, null);
            System.debug(LoggingLevel.Error,'testFilterRows: TEST ERROR KO / no error raised for no filter class configuration');
            System.assert(false,'testFilterRows: no error raised for no filter class configuration');
        }
        catch (Exception e) {
            System.debug('testFilterRows: TEST ERROR OK / error properly raised for no filter class configuration ' + e.getMessage());
            System.assert(true,'testFilterRows: error properly raised for no filter class configuration ' + e.getMessage());
        }

        try {
            sfpegMassAction_CTL.filterRows('sfpegTestDummyFilterNoActionClass', null, null);
            System.debug(LoggingLevel.Error,'testFilterRows: TEST ERROR KO / no error raised for unknown filter class configuration');
            System.assert(false,'testFilterRows: no error raised for unknwon filter class configuration');
        }
        catch (Exception e) {
            System.debug('testFilterRows: TEST ERROR OK / error properly raised for unknwon filter class configuration ' + e.getMessage());
            System.assert(true,'testFilterRows: error properly raised for unknwon filter class configuration ' + e.getMessage());
        }

        try {
            sfpegMassAction_CTL.filterRows('sfpegTestNoImplementation', null, null);
            System.debug(LoggingLevel.Error,'testFilterRows: TEST ERROR KO / no error raised for class with no filter implementation');
            System.assert(false,'testFilterRows: no error raised for class with no filter implementation');
        }
        catch (Exception e) {
            System.debug('testFilterRows: TEST ERROR OK / error properly raised for class with no filter implementation ' + e.getMessage());
            System.assert(true,'testFilterRows: error properly raised for class with no filter implementation ' + e.getMessage());
        }

        // Standard OK Case
        List<sfpegTestObject__c> testRows = new List<sfpegTestObject__c>();
        map<Object,Object> context = new Map<Object,Object>{'Object' => 'sfpegTestObject__c'};
        try {
            testRows.add(new sfpegTestObject__c(Name = 'TEST1'));
            testRows.add(new sfpegTestObject__c(Name = 'TEST2'));
            insert testRows;
            //List<sfpegTestObject__c> rows = [select Id from sfpegTestObject__c];
            List<Map<Object,Object>> rows = new List<Map<Object,Object>>();
            rows.add(new Map<Object,Object>{'Name' => testRows[0].Name, 'Id' => testRows[0].Id});
            rows.add(new Map<Object,Object>{'Name' => testRows[1].Name, 'Id' => testRows[1].Id});
            sfpegMassAction_CTL.filterRows('sfpegTestSoqlDml',rows,context);
            System.debug('testFilterRows: TEST SUCCESS OK / no error raised for valid filter configuration');
            System.assert(true,'testFilterRows: no error raised for valid filter configuration');
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testFilterRows: TEST SUCCESS KO / error raised for valid filter configuration ' + e.getMessage());
            System.assert(false,'testFilterRows: error raised for valid filter configuration ' + e.getMessage());
        }

        // SOQL filter specific cases
        sfpegMassActionSoqlDml_SVC  testHandler = new sfpegMassActionSoqlDml_SVC();
        try {
            testHandler.filterRows('select Id from {{{OBJECT}}} where Id in ({{{RCD.Id}}})', testRows, context);
            System.debug(LoggingLevel.Error,'testFilterRows: TEST ERROR KO / no error raised for invalid SOQL filter');
            System.assert(false,'testFilterRows: no error raised for invalid SOQL filter');
        }
        catch (Exception e) {
            System.debug('testFilterRows: TEST ERROR OK / error properly raised for invalid SOQL filter ' + e.getMessage());
            System.assert(true,'testFilterRows: error properly raised for invalid SOQL filter ' + e.getMessage());
        }

        List<String> rowIds = new List<String>();
        rowIds.add(testRows[0].Id);
        rowIds.add(testRows[1].Id);
        String objectContext = 'sfpegTestObject__c';
        try {
            testHandler.filterRows('select Id from {{{CTX}}} where Id in ({{{ROWS}}})', rowIds,objectContext);
            System.debug('testFilterRows: TEST SUCCESS OK / no error raised for valid alternate SOQL filter');
            System.assert(true,'testFilterRows: no error raised for valid alternate SOQL filter');
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testFilterRows: TEST SUCCESS KO / error raised for valid alternate SOQL filter ' + e.getMessage());
            System.assert(false,'testFilterRows: error properly raised for valid alternate SOQL filter ' + e.getMessage());
        }

        Test.stopTest();
        System.debug('testFilterRows: END');
    }


    /***
    * @description  Test method for the sfpegAction_CTL class, checking the "executeAction" method
    *               which also involves the sfpegAction_SVC and sfpegMassActionSoqlDml_SVC classes.
    * @see  sfpegMassAction_CTL
    * @see  sfpegMassAction_SVC
    * @see  sfpegMassActionSoqlDml_SVC
    ***/

    @isTest
    static void testExecuteAction() {
        System.debug('testExecuteAction: START');
        Test.startTest();

        // KO Cases
        try {
            sfpegMassAction_CTL.executeAction('sfpegTestDummy', null, null);
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST ERROR KO / no error raised for for unknown configuration');
            System.assert(false,'testExecuteAction: no error raised for for unknown configuration');
        }
        catch (Exception e) {
            System.debug('testExecuteAction: TEST ERROR OK / error properly raised for unknown configuration' + e.getMessage());
            System.assert(true,'testExecuteAction: error properly raised for unknown configuration' + e.getMessage());
        }

        try {
            sfpegMassAction_CTL.executeAction('sfpegTestDummyFilterNoActionClass', null, null);
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST ERROR KO / no error raised for no action class configuration');
            System.assert(false,'testExecuteAction: no error raised for no action class configuration');
        }
        catch (Exception e) {
            System.debug('testExecuteAction: TEST ERROR OK / error properly raised for no action class configuration ' + e.getMessage());
            System.assert(true,'testExecuteAction: error properly raised for no action class configuration ' + e.getMessage());
        }

        try {
            sfpegMassAction_CTL.executeAction('sfpegTestNoFilterClassDummyAction', null, null);
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST ERROR KO / no error raised for unknown action class configuration');
            System.assert(false,'testExecuteAction: no error raised for unknown action class configuration');
        }
        catch (Exception e) {
            System.debug('testExecuteAction: TEST ERROR OK / error properly raised for unknown action class configuration ' + e.getMessage());
            System.assert(true,'testExecuteAction: error properly raised for unknown action class configuration ' + e.getMessage());
        }

        try {
            sfpegMassAction_CTL.executeAction('sfpegTestNoImplementation', null, null);
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST ERROR KO / no error raised for class with no action implementation');
            System.assert(false,'testExecuteAction: no error raised for class with no action implementation');
        }
        catch (Exception e) {
            System.debug('testExecuteAction: TEST ERROR OK / error properly raised for ifor class with no action implementation ' + e.getMessage());
            System.assert(true,'testExecuteAction: error properly raised for ifor class with no action implementation ' + e.getMessage());
        }

        // Standard OK Case
        List<sfpegTestObject__c> testRows = new List<sfpegTestObject__c>();
        map<String,Object> context = new Map<String,Object>{'UserId' => UserInfo.getUserId() };
        try {
            testRows.add(new sfpegTestObject__c(Name = 'TEST1'));
            testRows.add(new sfpegTestObject__c(Name = 'TEST2'));
            sfpegMassAction_CTL.executeAction('sfpegTestSoqlDml',testRows,context);
            System.debug('testExecuteAction: TEST SUCCESS OK / no error raised for valid action configuration');
            System.assert(true,'testExecuteAction: no error raised for valid action configuration');
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST SUCCESS KO / error raised for valid action configuration ' + e.getMessage());
            System.assert(false,'testExecuteAction: error raised for valid action configuration ' + e.getMessage());
        }

        // SOQL filter specific cases
        try {
            sfpegMassAction_SVC.ActionResult testResult = new sfpegMassAction_SVC.ActionResult();
            testResult.isOK = false;
            System.debug('testExecuteAction: TEST SUCCESS OK / no error raised with default result constructor');
            System.assert(true,'testExecuteAction: no error raised with default result constructor');
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST SUCCESS KO / error raised with default result constructor ' + e.getMessage());
            System.assert(false,'testExecuteAction: error raised with default result constructor ' + e.getMessage());
        }

        sfpegMassActionSoqlDml_SVC  testHandler = new sfpegMassActionSoqlDml_SVC();
        try {
            testHandler.executeAction('insert',testRows,context);
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST ERROR KO / no error raised for already inserted records');
            System.assert(false,'testExecuteAction: no error raised for already inserted records');
        }
        catch (Exception e) {
            System.debug('testExecuteAction: TEST ERROR OK / error properly raised for already inserted records ' + e.getMessage());
            System.assert(true,'testExecuteAction: error properly raised for already inserted records ' + e.getMessage());
        }

        try {
            testHandler.executeAction('update',testRows,context);
            System.debug('testExecuteAction: TEST SUCCESS OK / no error raised for updated records');
            System.assert(true,'testExecuteAction: no error raised for updated records');
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST SUCCESS KO / error raised for updated records ' + e.getMessage());
            System.assert(false,'testExecuteAction: error raised for updated records ' + e.getMessage());
        }

        try {
            testHandler.executeAction('delete',testRows,context);
            System.debug('testExecuteAction: TEST SUCCESS OK / no error raised for deleted records');
            System.assert(true,'testExecuteAction: no error raised for deleted records');
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST SUCCESS KO / error raised for deleted records ' + e.getMessage());
            System.assert(false,'testExecuteAction: error raised for deleted records ' + e.getMessage());
        }

        try {
            List<sfpegMassAction_SVC.ActionResult> results = testHandler.executeAction('updateBE',testRows,context);
            System.debug('testExecuteAction: BE update results returned ' + results);
            Boolean isOK = false;
            for (sfpegMassAction_SVC.ActionResult iter : results) {
                if (iter.isOK) isOK = true;
            }
            if (isOK) {
                System.debug('testExecuteAction: TEST ERROR KO / missing errors returned for BE updates on deleted records');
            }
            else {
                System.debug('testExecuteAction: TEST ERROR OK / errors properly returned for BE updates on deleted records');
            }
            System.assert(!isOK,'testExecuteAction: not all errors returned for BE updates on deleted records');
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST ERROR KO / error raised for BE updates on deleted records ' + e.getMessage());
            System.assert(false,'testExecuteAction: error raised for BE updates on deleted records ' + e.getMessage());
        }

        try {
            List<sfpegMassAction_SVC.ActionResult> results = testHandler.executeAction('deleteBE',testRows,context);
            System.debug('testExecuteAction: BE delete results returned ' + results);
            Boolean isOK = false;
            for (sfpegMassAction_SVC.ActionResult iter : results) {
                if (iter.isOK) isOK = true;
            }
            if (isOK) {
                System.debug('testExecuteAction: TEST ERROR KO / missing errors returned for BE deletes on deleted records');
            }
            else {
                System.debug('testExecuteAction: TEST ERROR OK / errors properly returned for BE deletes on deleted records');
            }
            System.assert(!isOK,'testExecuteAction: not all errors returned for BE deletes on deleted records');
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST ERROR KO / error raised for BE deletes on deleted records ' + e.getMessage());
            System.assert(false,'testExecuteAction: error raised for BE deletes on deleted records ' + e.getMessage());
        }

        try {
            testHandler.executeAction('dummy',testRows,context);
            System.debug('testExecuteAction: TEST ERROR KO / no error raised for unsupported DML');
            System.assert(false,'testExecuteAction: no error raised for unsupported DML');
        }
        catch (Exception e) {
            System.debug(LoggingLevel.Error,'testExecuteAction: TEST ERROR OK / error properly raised for unsupported DML ' + e.getMessage());
            System.assert(true,'testExecuteAction: error properly raised for unsupported DML ' + e.getMessage());
        }

        Test.stopTest();
        System.debug('testExecuteAction: END');
    }
}