import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.util.ArrayList;

public class GenerateCliqScript
{
    public static String newline = System.getProperty("line.separator");
    public static String pathSeperator = System.getProperty("file.separator");
    public static String path;
    public static int lengthOfArguments = 0;
    public static String processConfContent = "";
    public static ArrayList<String> listOfFields = new ArrayList();
    public static String sourceUserName;
    public static String sourcePassword;
    public static String sfObject;
    public static String sfProxy = "";
    public static String sfProxyPort = "";
    public static String destinationUserName;
    public static String destinationPassword;
    public static String upsertRelationship;
    public static String upsertExternalId;
    public static boolean upsertRequired;
    public static String dataLoader;
    public static String whereClause ="";
    public static String endPoint;
    public static String destinationEndpoint;
    public static String dataloaderVersion;

    public GenerateCliqScript() {}
    //todo externalid+externalrelationship

    public static void main(String[] paramArrayOfString)
    {
        if (paramArrayOfString[0].equals("-help")) {
            printHelp();
        } else {
            processArguments(paramArrayOfString);
            System.out.println("This is the path " + path);
            if (isValidCommand().booleanValue()) {
                generateSDLFile(false);
                if (upsertRequired) {
                    generateSDLFile(true);
                }
                generateProcessConf(paramArrayOfString);
            }
        }
    }





    public static Boolean isValidCommand()
    {
        if ((listOfFields.isEmpty()) || (sourcePassword == null) || (sourceUserName == null) || (sfObject == null) || (path == null) || (destinationUserName == null) || (destinationPassword == null) || (endPoint == null) || (dataLoader == null))
        {

            System.out.println("There is a problem with the request, a required input was missing :");
            System.out.println("fields used (-f) : " + listOfFields);
            System.out.println("password used (-sp) : " + sourcePassword);
            System.out.println("username used (-su) : " + sourceUserName);
            System.out.println("object used (-o) :  " + sfObject);
            System.out.println("path used (-l) :  " + path);
            System.out.println("Destination username (-du) :  " + destinationUserName);
            System.out.println("Destination password (-dp) :  " + destinationPassword);
            System.out.println("Dataloader filename (-dlv) :  " + dataLoader);
            System.out.println("Endpoint (-e) :  " + endPoint);



            return Boolean.valueOf(false);
        }

        return Boolean.valueOf(true);
    }







    public static void getVersion(String fileName) {
        int index = fileName.indexOf('-') + 1;
        char currentChar = fileName.charAt(index);
        int dotCount = 0;
        dataloaderVersion = "";
        while (currentChar != '.') {
            dataloaderVersion+= currentChar;
            index+= 1;
            currentChar = fileName.charAt(index);
        }

    }

    public static void printHelp()
    {
        System.out.println("Below is a list of the commands that can be used:");
        System.out.println("fields used (-f) e.g -f field1__c field2__c");
        System.out.println("Source system password (-sp) e.g -sp password1");
        System.out.println("Source system username (-su) e.g -su someone@salesforce.com");
        System.out.println("Object to be used (-o) e.g -o Account");
        System.out.println("Path to build the scripts (-l) e.g c:\\dataloader\\cliqscript\\");
        System.out.println("Destination system username (-du) e.g -du password");
        System.out.println("Destination system password (-dp) e.g -dp password1");
        System.out.println("Proxy to be used (-pr) e.g -pr proxy");
        System.out.println("Proxy port to be used (-pp) e.g -pp 9090");
        System.out.println("Where Clause for extract (-w) e.g -w Where Name = 'John'");
        System.out.println("Dataloader file name (-dlv) e.g -dvl dataloader-39.0.0.jar");
        System.out.println("Endpoint to be used (-e) e.g -e http://login.salesforce.com");
    }








    private static void processArguments(String[] paramArrayOfString)
    {
        upsertRequired = false;
        lengthOfArguments = paramArrayOfString.length;
        int i = 0;
        while (i < lengthOfArguments)
        {
            if (paramArrayOfString[i].equals("-su")) {
                sourceUserName = paramArrayOfString[(i + 1)];
            }

            if (paramArrayOfString[i].equals("-sp")) {
                sourcePassword = paramArrayOfString[(i + 1)];
            }

            if (paramArrayOfString[i].equals("-o")) {
                sfObject = paramArrayOfString[(i + 1)];
            }

            if (paramArrayOfString[i].equals("-l")) {
                try {
                    File localFile = new File(".");
                    path = localFile.getCanonicalPath() + paramArrayOfString[(i + 1)];
                    if (path.contains("\"")) {
                        path = path.replace("\"", "");
                    }
                }
                catch (Exception localException) {}
            }



            if (paramArrayOfString[i].equals("-f")) {
                for (int j = i + 1; !paramArrayOfString[j].contains("-"); j += 1) {
                    listOfFields.add(paramArrayOfString[j]);
                }
            }
            if (paramArrayOfString[i].equals("-pr")) {
                sfProxy = paramArrayOfString[(i + 1)];
            }
            if (paramArrayOfString[i].equals("-pp")) {
                sfProxyPort = paramArrayOfString[(i + 1)];
            }
            if (paramArrayOfString[i].equals("-dp")) {
                destinationPassword = paramArrayOfString[(i + 1)];
            }

            if (paramArrayOfString[i].equals("-du")) {
                    destinationUserName = paramArrayOfString[(i + 1)];
                }
                if (paramArrayOfString[i].equals("-de")) {
                  int j = i + 1;
                  if (j < lengthOfArguments && !paramArrayOfString[j].contains("-") && !paramArrayOfString[j].equals("")) {
                          destinationEndpoint = paramArrayOfString[j];
                  }


                  
                }
                if (paramArrayOfString[i].equals("-upsertR")) {
                    if (!paramArrayOfString[(i + 1)].contains("-")) {
                        upsertRelationship = paramArrayOfString[(i + 1)];
                    }
                }
                if (paramArrayOfString[i].equals("-upsertId")) {
                    if (!paramArrayOfString[(i + 1)].equals("-upsertR")) {
                      upsertExternalId = paramArrayOfString[(i + 1)];
                    }
                }
                if (paramArrayOfString[i].equals("-w")) {
                    for (int j = i + 1; j < lengthOfArguments && !paramArrayOfString[j].contains("-"); j += 1) {
                        if (!paramArrayOfString[j].equals("")) {
                        whereClause += paramArrayOfString[j] + " ";
                        }

                    }
                    if (whereClause.length()!=0 && whereClause.charAt(whereClause.length() -1) == ' ') {
                      whereClause = whereClause.substring(0,whereClause.length()-1);
                    }
                }
                if (paramArrayOfString[i].equals("-dlv")) {
                    dataLoader = paramArrayOfString[(i + 1)];
                    getVersion(dataLoader);
                }
                if (paramArrayOfString[i].equals("-e")) {
                    endPoint = paramArrayOfString[(i + 1)];
                }
                i++;

            if (upsertExternalId != null) {
                upsertRequired = true;
            }
        }
        if (destinationEndpoint == null) {
            destinationEndpoint = endPoint;
        }
        System.out.println(endPoint.toString());
        System.out.println(destinationEndpoint.toString());

    }








    private static void generateSDLFile(boolean paramBoolean)
    {
        try
        {
            String str = "";

            File localFile = new File(path + "config" + pathSeperator + "object.sdl");
            int i = 0;
            String[] arrayOfString = new String[listOfFields.size()];
            listOfFields.toArray(arrayOfString);

            while (i < listOfFields.size()) {
                str = str + arrayOfString[i] + "=" + arrayOfString[i] + newline;
                i++;
            }
            if (paramBoolean == true) {
                if (upsertRelationship == null) {
                    str = str + "ExternalID=" + upsertExternalId;
                } else {
                    str = str + "ExternalID=" + upsertRelationship + "\\:" + upsertExternalId;
                }

                localFile = new File(path + "config" + pathSeperator + "upsertObject.sdl");
            }



            if (!localFile.exists()) {
                localFile.createNewFile();
            }

            java.io.FileWriter localFileWriter = new java.io.FileWriter(localFile.getAbsoluteFile());
            BufferedWriter localBufferedWriter = new BufferedWriter(localFileWriter);
            localBufferedWriter.write(str);
            localBufferedWriter.close();

            System.out.println("SDL File built");
        }
        catch (IOException localIOException) {
            localIOException.printStackTrace();
        }
    }







    private static void createBeanAndID(String paramString)
    {
        processConfContent = processConfContent + newline + "    <bean id=\"" + paramString + "\" class=\"com.salesforce.dataloader.process.ProcessRunner\" singleton=\"false\">" + newline;
        processConfContent = processConfContent + "\t\t<description>Created by Dataloader Cliq.</description>" + newline + "\t\t<property name=\"name\" value=\"" + paramString + "\"/>" + newline;
    }






    private static void createProcessType(String paramString1, String paramString2)
    {
        processConfContent = processConfContent + "\t\t<property name=\"configOverrideMap\">" + newline + "\t\t\t<map>" + newline + "\t\t\t\t<entry key=\"dataAccess.name\" value=\"" + path + "read" + pathSeperator + "genericObject.csv\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"dataAccess.readUTF8\" value=\"true\"/>" + newline + "\t\t\t\t<entry key=\"dataAccess.type\" value=\"" + paramString1 + "\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"dataAccess.writeUTF8\" value=\"true\"/>" + newline + "\t\t\t\t<entry key=\"process.enableExtractStatusOutput\" value=\"true\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"process.enableLastRunOutput\" value=\"true\"/>" + newline + "\t\t\t\t<entry key=\"process.lastRunOutputDirectory\" value=\"" + path + "log\"/>" + newline;
        if ((paramString1 == "csvRead") && (paramString2.equals("insert"))) {
            processConfContent = processConfContent + "\t\t\t\t<entry key=\"process.mappingFile\" value=\"" + path + "config" + pathSeperator + "object.sdl\"/>";
        } else if ((paramString1 == "csvRead") && (paramString2.equals("delete"))) {
            processConfContent = processConfContent + "\t\t\t\t<entry key=\"process.mappingFile\" value=\"" + path + "config" + pathSeperator + "deleteObject.sdl\"/>";
        } else if ((paramString1 == "csvRead") && (paramString2.equals("upsert"))) {
            processConfContent = processConfContent + "\t\t\t\t<entry key=\"process.mappingFile\" value=\"" + path + "config" + pathSeperator + "upsertObject.sdl\"/>";
        } else if ((paramString1 == "csvRead") && (paramString2.equals("update"))) {
            processConfContent = processConfContent + "\t\t\t\t<entry key=\"process.mappingFile\" value=\"" + path + "config" + pathSeperator + "object.sdl\"/>";
        } 
    }






    private static void createOperation(String paramString, String[] paramArrayOfString)
    {
        processConfContent = processConfContent + newline + "\t\t\t\t<entry key=\"process.operation\" value=\"" + paramString + "\"/>" + newline + "\t\t\t\t<entry key=\"process.statusOutputDirectory\" value=\"" + path + "log\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.bulkApiCheckStatusInterval\" value=\"5000\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.bulkApiSerialMode\" value=\"5000\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.debugMessages\" value=\"false\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.enableRetries\" value=\"true\"/>" + newline;
        if (paramString.equals("extract")) {
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.endpoint\" value=\"" + endPoint + "/services/Soap/u/" + dataloaderVersion + "\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.entity\" value=\"" + sfObject + "\"/>" + newline;
          
        } else {
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.endpoint\" value=\"" + destinationEndpoint + "/services/Soap/u/" + dataloaderVersion + "\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.entity\" value=\"" + sfObject + "\"/>" + newline;

        }
        if (paramString.equals("upsert")) {
            processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.externalIdField\" value=\"" + upsertExternalId + "\"/>" + newline;
        }
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.extractionRequestSize\" value=\"500\"/>" + newline;
        if (paramString == "extract") {
            processConfContent += "\t\t\t\t<entry key=\"sfdc.extractionSOQL\" value=\"Select Id";

            int i = 0;
            String[] arrayOfString = new String[listOfFields.size()];
            listOfFields.toArray(arrayOfString);
            while (i < listOfFields.size()) {
                processConfContent = processConfContent + ", " + arrayOfString[i];
                i++;
            }
            processConfContent = processConfContent + " From " + sfObject + " " + whereClause + " LIMIT 200 \"/>" + newline;
        }
    }







    private static void completeProcessConfBean(String paramString1, String paramString2)
    {
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.insertNulls\" value=\"false\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.loadBatchSize\" value=\"200\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.maxRetries\" value=\"3\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.minRetrySleepSecs\" value=\"2\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.noCompression\" value=\"false\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.password\" value=\"" + paramString2 + "\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.proxyHost\" value=\"" + sfProxy + "\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.proxyNtlmDomain\" value=\"\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.proxyPassword\" value=\"\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.proxyPort\" value=\"" + sfProxyPort + "\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.proxyUsername\" value=\"\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.timeoutSecs\" value=\"60\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t\t<entry key=\"sfdc.useBulkApi\" value=\"false\"/>" + newline + "\t\t\t\t<entry key=\"sfdc.username\" value=\"" + paramString1 + "\"/>" + newline;
        processConfContent = processConfContent + "\t\t\t</map>" + newline + "\t\t</property>" + newline + "\t</bean>" + newline;
    }






    private static void createInsert(String[] paramArrayOfString)
    {
        createBeanAndID("insertObject");
        createProcessType("csvRead", "insert");
        createOperation("insert", paramArrayOfString);
        completeProcessConfBean(destinationUserName, destinationPassword);
        generateScript("insertObject.sh", "insertObject");
        generateScript("insertObject.bat", "insertObject");
    }






    private static void createDelete(String[] paramArrayOfString)
    {
        createBeanAndID("deleteObject");
        createProcessType("csvRead", "delete");
        createOperation("delete", paramArrayOfString);
        completeProcessConfBean(destinationUserName, destinationPassword);
        generateScript("deleteObject.sh", "deleteObject");
        generateScript("deleteObject.bat", "deleteObject");
    }






    private static void createExtract(String[] paramArrayOfString)
    {
        createBeanAndID("extractObject");
        createProcessType("csvWrite", "extract");
        createOperation("extract", paramArrayOfString);
        completeProcessConfBean(sourceUserName, sourcePassword);
        generateScript("extractObject.sh", "extractObject");
        generateScript("extractObject.bat", "extractObject");
    }







    private static void createUpsert(String[] paramArrayOfString)
    {
        createBeanAndID("upsertObject");
        createProcessType("csvRead", "upsert");
        createOperation("upsert", paramArrayOfString);
        completeProcessConfBean(destinationUserName, destinationPassword);
        generateScript("upsertObject.sh", "upsertObject");
        generateScript("upsertObject.bat", "upsertObject");
    }

    private static void createUpdate(String[] paramArrayOfString)
    {
        createBeanAndID("updateObject");
        createProcessType("csvRead", "update");
        createOperation("update", paramArrayOfString);
        completeProcessConfBean(destinationUserName, destinationPassword);
        generateScript("updateObject.sh", "updateObject");
        generateScript("updateObject.bat", "updateObject");
    }



    private static void generateProcessConf(String[] paramArrayOfString)
    {
        try
        {
            processConfContent = "<!DOCTYPE beans PUBLIC \"-//SPRING//DTD BEAN//EN\" \"http://www.springframework.org/dtd/spring-beans.dtd\">" + newline + "<beans>" + newline;
            createInsert(paramArrayOfString);
            createDelete(paramArrayOfString);
            createExtract(paramArrayOfString);
            createUpdate(paramArrayOfString);
            if (upsertRequired) {
                createUpsert(paramArrayOfString);
            }

            processConfContent = processConfContent + newline + "</beans>";
            File localFile = new File(path + "config" + pathSeperator + "process-conf.xml");


            if (!localFile.exists()) {
                localFile.createNewFile();
            }

            java.io.FileWriter localFileWriter = new java.io.FileWriter(localFile.getAbsoluteFile());
            BufferedWriter localBufferedWriter = new BufferedWriter(localFileWriter);
            localBufferedWriter.write(processConfContent);
            localBufferedWriter.close();

            System.out.println("Process-conf Built");
        }
        catch (IOException localIOException) {
            localIOException.printStackTrace();
        }
    }






    private static void generateScript(String paramString1, String paramString2)
    {
        String str = "";

        str = str + "cd " + path + newline + newline;
        str = str + "java -cp " + dataLoader;
        str = str + " -Dsalesforce.config.dir=config com.salesforce.dataloader.process.ProcessRunner process.name=" + paramString2;
        try {
            File localFile = new File(path + paramString1);


            if (!localFile.exists()) {
                localFile.createNewFile();
            }

            java.io.FileWriter localFileWriter = new java.io.FileWriter(localFile.getAbsoluteFile());
            BufferedWriter localBufferedWriter = new BufferedWriter(localFileWriter);
            localBufferedWriter.write(str);
            localBufferedWriter.close();

            System.out.println(paramString1 + " Built");
        }
        catch (IOException localIOException) {
            localIOException.printStackTrace();
        }
    }





}
