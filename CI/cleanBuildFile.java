
/*
 * Decompiled with CFR 0_118.
 */
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.PrintStream;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import javax.swing.filechooser.FileNameExtensionFilter;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.*;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;


public class cleanBuildFile {
    public static String pathSeperator = System.getProperty("file.separator");
    public static String[] lines;
    public static ArrayList<String> listOfFiles;
    public static ArrayList<String> lowerCaseFiles;
    public static ArrayList<String> actualFiless = new ArrayList<String>();
    public static ArrayList<String> fileNames = new ArrayList<String>();
    public static ArrayList<String> filesToWarn = new ArrayList<String>();

    public static String path;
    public static HashMap<String,String> fileToMeta;
    private static boolean genPack;
    public static void findCurrentPath() {
        try {
            File file = new File(".");
            path = file.getCanonicalPath();
        }
        catch (Exception var0_1) {
            System.out.println("Failed to get current path");
        }
    }
    private static void fillMetaMap(){
        fileToMeta = new HashMap<String,String>();
        fileToMeta.put("cls","ApexClass");
        fileToMeta.put("page","ApexPage");
        fileToMeta.put("component","ApexComponent");
        fileToMeta.put("labels","CustomLabels");
        fileToMeta.put("approvalProcess","ApprovalProcess");
        fileToMeta.put("entitlementProcess","EntitlementProcess");
        fileToMeta.put("entitlementTemplate","EntitlementTemplate");
        fileToMeta.put("externalServiceRegistration","ExternalServiceRegistration");
        fileToMeta.put("dataSource","ExternalDataSource");
        fileToMeta.put("email","EmailTemplate");
        fileToMeta.put("layout","Layout");
        fileToMeta.put("object","CustomObject");
        fileToMeta.put("profile","Profile");
        fileToMeta.put("resource","StaticResource");
        fileToMeta.put("trigger","ApexTrigger");
        fileToMeta.put("workflow","Workflow");
        fileToMeta.put("tab","CustomTab");
        fileToMeta.put("community","Community");
        fileToMeta.put("communityTemplateDefinition","CommunityTemplateDefinition");
        fileToMeta.put("communityThemeDefinition","CommunityThemeDefinition");
        fileToMeta.put("app","CustomApplication");
        fileToMeta.put("site","CustomSite");
        fileToMeta.put("callCenter","CallCenter");
        fileToMeta.put("connectedapp","ConnectedApp");
        fileToMeta.put("customApplicationComponent","CustomApplicationComponent");
        fileToMeta.put("md","CustomMetadata");
        fileToMeta.put("objectTranslation","CustomObjectTranslation");
        fileToMeta.put("weblink","CustomPageWebLink");
        fileToMeta.put("customPermission","CustomPermission");
        fileToMeta.put("dashboard","Dashboard");
        fileToMeta.put("datacategorygroup","DataCategoryGroup");
        fileToMeta.put("flexipage","FlexiPage");
        fileToMeta.put("flow","Flow");
        fileToMeta.put("globalValueSet","GlobalValueSet");
        fileToMeta.put("globalValueSetTranslation","GlobalValueSetTranslation");
        fileToMeta.put("group","Group");
        fileToMeta.put("homePageComponent","HomePageComponent");
        fileToMeta.put("homePageLayout","HomePageLayout");
        fileToMeta.put("installedPackage","InstalledPackage");
        fileToMeta.put("keywords","KeywordList");
        fileToMeta.put("letter","Letterhead");
        fileToMeta.put("liveChatAgentConfig","LiveChatAgentConfig");
        fileToMeta.put("liveChatButton","LiveChatButton");
        fileToMeta.put("liveChatDeployment","LiveChatDeployment");
        fileToMeta.put("liveChatSensitiveDataRule","LiveChatSensitiveDataRule");
        fileToMeta.put("managedTopics","ManagedTopics");
        fileToMeta.put("matchingRule","MatchingRule");
        fileToMeta.put("milestoneType","MilestoneType");
        fileToMeta.put("rule","ModerationRule");
        fileToMeta.put("namedCredential","NamedCredential");
        fileToMeta.put("network","Network");
        fileToMeta.put("pathAssistant","PathAssistant");
        fileToMeta.put("portal","Portal");
        fileToMeta.put("cachePartition","PlatformCachePartition");
        fileToMeta.put("remoteSite","RemoteSiteSetting");
        fileToMeta.put("sharingRules","SharingRules");
        fileToMeta.put("skill","Skill");
        fileToMeta.put("standardValueSet","StandardValueSet");
        fileToMeta.put("standardValueSetTranslation","StandardValueSetTranslation");
        fileToMeta.put("synonymDictionary","SynonymDictionary");
        fileToMeta.put("territory","Territory");
        fileToMeta.put("territory2","Territory2");

        fileToMeta.put("transactionSecurityPolicy","TransactionSecurityPolicy");
        fileToMeta.put("translation","Translations");
        fileToMeta.put("wapp","WaveApplication");
        fileToMeta.put("wdash","WaveDashboard");
        fileToMeta.put("wdf","WaveDataflow");
        fileToMeta.put("wds","WaveDataset");
        fileToMeta.put("wlens","WaveLens");


        fileToMeta.put("permissionset","PermissionSet");
        fileToMeta.put("postTemplate","PostTemplate");
        fileToMeta.put("queue","Queue");
        fileToMeta.put("quickAction","QuickAction");
        fileToMeta.put("report","Report");
        fileToMeta.put("reportType","ReportType");
        fileToMeta.put("role","Role");
        fileToMeta.put("samlssoconfig","SamlSsoConfig");
        fileToMeta.put("scf","Scontrol");
        fileToMeta.put("sharingSet","SharingSet");
        fileToMeta.put("duplicateRule","DuplicateRule");
        fileToMeta.put("settings","Settings");
        fileToMeta.put(".actionLinkGroupTemplate","ActionLinkGroupTemplate");
        fileToMeta.put("analyticsnapshot","AnalyticSnapshot");
        fileToMeta.put("snapshot","AnalyticSnapshot");

        fileToMeta.put("appMenu","AppMenu");
        fileToMeta.put("assignmentRules","AssignmentRule");
        fileToMeta.put("authprovider","AuthProvider");
        fileToMeta.put("autoResponseRules","AutoResponseRules");
        fileToMeta.put("crt","Certificate");
        fileToMeta.put("cleanDataService","CleanDataService");
        fileToMeta.put("asset","ContentAsset");
        fileToMeta.put("corswhitelistorigin","CorsWhitelistOrigin");
        fileToMeta.put("feedFilter","CustomFeedFilter");
        fileToMeta.put("delegateGroup","DelegateGroup");
        fileToMeta.put("flowDefinition","FlowDefinition");
        fileToMeta.put("xmd","Wavexmd");
        fileToMeta.put("territory2Model","Territory2Model");


        //THESE ARE MORE COMPLCATED AS THEY HAVE FOLDER STRUCTURES
//        fileToMeta.put("","WaveTemplateBundle");
//        fileToMeta.put("AuraDefinitionBundle","");
//        fileToMeta.put("territory2Rule","");
//        fileToMeta.put("","Documents");
//        fileToMeta.put("","Folder");

        //      fileToMeta.put("territory2Type ","");
    }
    public static void main(String[] arrstring) {

        fillMetaMap();
        cleanBuildFile.findCurrentPath();

        if (arrstring.length == 0) {
            genPack = true;
        } else {
            if (arrstring[0].equals("no") || arrstring[0].equals("No") || arrstring[0].equals("NO")) {
                System.out.println("No PASSED SO NOT GENERATING PACKAGE.XML");
                genPack = false;
            } else {
                genPack = true;
            }
        }


        try {
            // System.out.println(path + pathSeperator + "filesToIncludeInBuild.txt");
            for (String string : cleanBuildFile.lines = cleanBuildFile.readLines(path + pathSeperator + "filesToIncludeInBuild.txt")) {
                // System.out.println("These are the files that will be included in the build : ");
                // System.out.println(string);
            }
        }
        catch (Exception var1_2) {
            System.out.println("There has been an issue reading the files to include in the build");
            System.out.print(var1_2.toString());
            return;
        }
        File[] arrstring2 = new File(path + pathSeperator + "src").listFiles();
        cleanBuildFile.showFiles(arrstring2);
        if (genPack) {
            generatePackage();
            if (!filesToWarn.isEmpty()) {
                for (int i = 0; i < filesToWarn.size() - 1; i++) {
                    System.out.println("PACKAGE XML ENTRY COULD NOT BE GENERATATED FOR : " + filesToWarn.get(i) + "  - PLEASE UPDATE MANUALLY BEFORE DEPLOYING");
                }
            }
        }
    }

    public static HashSet<String> auraFolders = new HashSet<String>();

    public static boolean isAuraFolder(File aFile) {
        Boolean result = false;
        Integer lastSlash = aFile.getName().lastIndexOf("/");
        String folderName = aFile.getName().substring(lastSlash+1);

        for (String s : auraFolders) {

            Integer lastSlash2 = s.lastIndexOf('/');
            String compFoldName = s.substring(lastSlash2 + 1);

            if (folderName.equals(compFoldName)) {
                return true;
            }
        }

        return result;
    }

    public static ArrayList<String> processAura(String theString , ArrayList<String> arrayList) {
        Integer slashIndex = theString.lastIndexOf('/');
        String foldName = theString.substring(0, slashIndex);
        auraFolders.add(foldName);
        arrayList.add(theString);

        return arrayList;
    }

    public static String[] readLines(String string) throws IOException {
        FileReader fileReader = new FileReader(string);
        BufferedReader bufferedReader = new BufferedReader(fileReader);
        ArrayList<String> arrayList = new ArrayList<String>();
        String string2 = null;
        while ((string2 = bufferedReader.readLine()) != null) {
            String str = string2.trim();

            if (str.length() == 0) continue;

            if (str.contains("/aura/")) {
                arrayList = processAura(str,arrayList);
            } else {
                arrayList.add(str);
                arrayList.add(str + "-meta.xml");
            }

            
        }
        bufferedReader.close();
        listOfFiles.addAll(arrayList);

        return arrayList.toArray(new String[arrayList.size()]);
    }

    private static String getExtension(String aFile) {
        int i = aFile.lastIndexOf('.');
        return aFile.substring(i+1);
    }
    private static void generatePackage() {
        try {
            DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
            DocumentBuilder docBuilder = docFactory.newDocumentBuilder();

            Document doc = docBuilder.newDocument();
            Element rootElement = doc.createElement("Package");
            rootElement.setAttribute("xmlns","http://soap.sforce.com/2006/04/metadata");
            doc.appendChild(rootElement);


            HashMap<String,Element> elementMap = new HashMap<String,Element>();
            for (String aFile : actualFiless) {
                if (aFile.endsWith("-meta.xml")) continue;


                String theExtension = getExtension(aFile);
               
                if (elementMap.containsKey(theExtension)) {
                    Element theElement = elementMap.get(theExtension);
                    Element newMember = doc.createElement("members");
                    if (theExtension.contains("report") && !theExtension.contains("reportType")) {
                        newMember.appendChild(doc.createTextNode(reportMap.get(aFile)));
                    } else {
                        newMember.appendChild(doc.createTextNode(removeExtension(aFile)));

                    }
                    theElement.appendChild(newMember);
                    elementMap.put(theExtension,theElement);

                } else {
                    Element theElement = doc.createElement("types");
                    Element theName = doc.createElement("name");
                    if (!fileToMeta.containsKey(theExtension)) {
                        System.out.println("ERROR GENERATING PACKAGE.XML.");
                        System.out.println("METADATA TYPE FOR " + theExtension + " NOT DEFINED    File : "  + aFile);
                        filesToWarn.add(aFile);
                        continue;
                    }
                    theName.appendChild(doc.createTextNode(fileToMeta.get(theExtension)));
                    theElement.appendChild(theName);
                    Element newMember = doc.createElement("members");
                    if (theExtension.contains("report")) {
                        newMember.appendChild(doc.createTextNode(reportMap.get(aFile)));
                    } else {
                        newMember.appendChild(doc.createTextNode(removeExtension(aFile)));

                    }
                    theElement.appendChild(newMember);
                    elementMap.put(theExtension,theElement);
                }

            }

            if (!auraFolders.isEmpty()){
                Element theElement = doc.createElement("types");
                Element theName = doc.createElement("name");
                theName.appendChild(doc.createTextNode("AuraDefinitionBundle"));
                theElement.appendChild(theName);

                for (String aF : auraFolders) {
                    Integer slashIndex = aF.lastIndexOf('/');
                    String name = aF.substring(slashIndex+1);
                    Element newMember = doc.createElement("members");
                    newMember.appendChild(doc.createTextNode(name));
                    theElement.appendChild(newMember);
                    


                }

                elementMap.put("js",theElement);


            }
    

            //TODO REDO LOWER CASE
            for (String key : elementMap.keySet()) {
                Element theElement = elementMap.get(key);
                theElement.appendChild(theElement.removeChild(theElement.getFirstChild()));
                rootElement.appendChild(theElement);
            }

            Element version = doc.createElement("version");
            version.appendChild(doc.createTextNode("36.0"));
            rootElement.appendChild(version);

            TransformerFactory transformerFactory = TransformerFactory.newInstance();
            Transformer transformer = transformerFactory.newTransformer();
            transformer.setOutputProperty(OutputKeys.INDENT,"yes");
            transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount","4");
            DOMSource source = new DOMSource(doc);

            StreamResult result = new StreamResult(new File(path + pathSeperator+"package.xml"));

            // Output to console for testing
            // StreamResult result = new StreamResult(System.out);

            transformer.transform(source, result);

            System.out.println("PACKAGE.XML GENERATED");


        } catch (ParserConfigurationException e) {
            e.printStackTrace();
        } catch (TransformerException e) {
            e.printStackTrace();
        }


    }

    private static String removeExtension(String aFile) {
        int i = aFile.lastIndexOf('.');
        return aFile.substring(0,i);
    }

    public static HashMap<String,String> reportMap = new HashMap<String,String>();


    public static void showFiles(File[] arrfile) {
        lowerCaseFiles = (ArrayList<String>) listOfFiles.clone();
        int size = lowerCaseFiles.size();
        for (int i = 0; i < size; i++) {
            String aFile = lowerCaseFiles.remove(0);
            String newFile = aFile.toLowerCase();
            lowerCaseFiles.add(newFile);

        }

       

        for (int i = 0; i < lowerCaseFiles.size() ; i++) {
            
            File f = new File(lowerCaseFiles.get(i));
            String temp = f.getName();
            fileNames.add(temp.toLowerCase());
        }
        
        for (File file : arrfile) {
            if (file.isDirectory()) {

                if (isAuraFolder(file)) {
                    continue;
                }

                if (file.getName().startsWith(".")) continue;
                cleanBuildFile.showFiles(file.listFiles());
                continue;
            }
            
            if (fileNames.contains(file.getName().toLowerCase())) {
                if (file.getName().contains(".report") && !file.getName().contains(".reportType")) {
                    Integer x = file.getAbsolutePath().lastIndexOf("/reports/") + 1;
                    Integer lastDot = file.getAbsolutePath().lastIndexOf(".");
                    String fold = file.getAbsolutePath().substring(x, lastDot);
                    reportMap.put(file.getName(), fold.replace("reports/",""));           

                }
                actualFiless.add(file.getName());
                continue;
            }
            file.delete();
        }
        for (File file : arrfile) {
            if (file.isDirectory()) {
                if(file.listFiles().length == 0) {
                    file.delete();
                }
            }
        }
    }

    static {
        listOfFiles = new ArrayList();
    }
}
