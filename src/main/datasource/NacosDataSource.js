import qs               from 'qs'
import urlUtils                   from "@/common/UrlUtils";
import yamlUtils                  from "@/common/YamlUtils";
import dubboConfigurationUtils    from "@/common/DubboConfigurationUtils";


class NacosDataSource {

    constructor(appCore) {
        this.appCore = appCore;
        this.name = "Nacos";
        this.invokerTypeList = ['java', 'telnet']
    }

    async getFormConfig() {
    
        return  {
          properties: [{
              label: this.appCore.t('connect.nacos.address'),		
              name: "address",		
              type: "input",		
              required: true, 
              default: 'http://127.0.0.1:8848',
            },
            {
                label: this.appCore.t('connect.nacos.namespaceId'),		
                name: "namespaceId",	
                type: "input",			
            },
            {
                label: this.appCore.t('connect.nacos.groupName'),			
                name: "groupName",		 
                type: "input",			 
                placeholder: this.appCore.t('connect.nacos.groupNameTips'),
            },
            {
                label: this.appCore.t('connect.nacos.group'),			
                name: "group",		 
                type: "input",			 
                placeholder: this.appCore.t('connect.nacos.groupTips'),
            },
            {
                label: this.appCore.t('connect.nacos.sessionTimeout'),			
                name: "sessionTimeout",		 
                type: "input",			
                required: true, 
                default: "5000",
            },
        ]}
    }

    async getServiceList(dataSourceInfo) {

        const params = {
            pageNo: 1,
            pageSize: 100,
            namespaceId: dataSourceInfo.namespaceId || "",
            groupName: dataSourceInfo.groupName || ""
        }
        // `http://127.0.0.1:8848/nacos/v1/ns/service/list?pageNo=1&pageSize=20`
        const url = `${dataSourceInfo.address}/nacos/v1/ns/service/list`

        let serviceList = new Array();
        do {
            const data = await this.doGetServiceList(url, params);
            // 异常？
            if (!data.count)  break;

            for (let i = 0; i < data.doms.length; i++) {

                // doms的每个元素： "providers:org.apache.dubbo.demo.DemoService:1.0.0:${分组}",
                const serviceName = data.doms[i];
                const datas = serviceName.split(":");

                // 不是提供者，忽略
                if (datas[0] != "providers") {
                    continue;
                }

                serviceList.push({
                    serviceName: datas[1],
                    uniqueServiceName: serviceName
                });
            }

            if(data.doms.length < params.pageSize) {
                break;
            }

            params.pageNo++;
        } while (true);

        return {
            list: serviceList,
            separator: '.',
            packageSeparator: '.'
        };
    }


    async doGetServiceList(url, params) {
        const response = await this.appCore.axios.get(url, {params});
        return response.data;
    }

    async getProviderList(dataSourceInfo, serviceInfo) {
        // http://127.0.0.1:8848/nacos/v1/ns/instance/list
        const url = `${dataSourceInfo.address}/nacos/v1/ns/instance/list`;

        const params = {
            serviceName: serviceInfo.uniqueServiceName,
            namespaceId: dataSourceInfo.namespaceId || "",
            groupName: dataSourceInfo.groupName || ""
        }

        const response = await this.appCore.axios.get(url, { params});
        if (!response.data || !response.data.hosts) {
            return [];
        }

        const serviceDisabledMap = new Map();
        const serviceMatadataMap = new Map();

        let array = new Array();
        for (let i = 0; i < response.data.hosts.length; i++) {
            let providerInfo = this.parseProvderInfo(response.data.hosts[i]);

            // 服务是否被禁用
            const disabledAddresses = await serviceDisabledMap.computeIfAbsent(this.buildDataId(providerInfo), async () => dubboConfigurationUtils.getDisableAddresses(await this.getJsonConfiguration(dataSourceInfo, serviceInfo, providerInfo)))
            providerInfo.disabled = disabledAddresses.find(item => item === '0.0.0.0' || item === providerInfo.address) != null;

            const metadata = await serviceMatadataMap.computeIfAbsent(this.buildMataDataPath(providerInfo), async (dataId) => JSON.parse(await this.getConfig(dataSourceInfo, dataId)));
      
            const methodList = [];
            if(metadata){
                metadata.methods.forEach(method => {
                    methodList.push({
                        ...method,
                        defaultParameter: JSON.stringify(this.appCore.getParamGenerator().generateParam(metadata, method.name), null, 2) || "[]",
                    });
                })
                } else {
                providerInfo.methods.forEach(method => {
                    methodList.push({
                    name: method,
                    parameterTypes: null,
                    defaultParameter: "[]",
                    returnType: null
                    });
                });
            }
            providerInfo.methods = methodList;

            array.push(providerInfo)
        }

        return array;
    }


    async getConsumerList(dataSourceInfo, serviceInfo) {

        // http://127.0.0.1:8848/nacos/v1/ns/instance/list
        let url = `${dataSourceInfo.address}/nacos/v1/ns/instance/list`;

        let params = {
            serviceName: serviceInfo.uniqueServiceName,
            namespaceId: dataSourceInfo.namespaceId || "",
            groupName: dataSourceInfo.groupName || ""
        }

        let response = await this.appCore.axios.get(url, { params });
        if (!response.data || !response.data.hosts) {
            return [];
        }

        let array = new Array();
        for (let i = 0; i < response.data.hosts.length; i++) {
            array.push(this.parseProvderInfo(response.data.hosts[i]))
        }

        return array;
    }


    async disableProvider(dataSourceInfo, serviceInfo, providerInfo) {
        let doc = await this.getJsonConfiguration(dataSourceInfo, serviceInfo, providerInfo);
    
        doc = await dubboConfigurationUtils.addDisableProvider(doc, providerInfo.address);
    
        await this.doSaveConfiguration(dataSourceInfo, providerInfo, doc);
    }

    
    async enableProvider(dataSourceInfo, serviceInfo, providerInfo) {
        let doc = await this.getJsonConfiguration(dataSourceInfo, serviceInfo, providerInfo);
    
        doc = await dubboConfigurationUtils.removeDisableProvider(doc, providerInfo.address);
    
        await this.doSaveConfiguration(dataSourceInfo, providerInfo, doc);
    }


    // eslint-disable-next-line no-unused-vars
    async getConfiguration(dataSourceInfo, serviceInfo, providerInfo) {
        const config = await this.getConfig(dataSourceInfo, this.buildDataId(providerInfo));
        return config ? config : yamlUtils.JSONToYaml(dubboConfigurationUtils.createDubboDefaultConfiguration());
    }

    // eslint-disable-next-line no-unused-vars
    async getJsonConfiguration(dataSourceInfo, serviceInfo, providerInfo) {
        return yamlUtils.yamlToJSON(await this.getConfiguration(dataSourceInfo, serviceInfo, providerInfo));
    }

    // eslint-disable-next-line no-unused-vars
    async saveConfiguration(dataSourceInfo, serviceInfo, providerInfo, doc) {
        // http://127.0.0.1:8848/nacos/v1/cs/configs
        let url = `${dataSourceInfo.address}/nacos/v1/cs/configs`;

        let params = {
            dataId: this.buildDataId(providerInfo),
            group: dataSourceInfo.group || 'dubbo', 
            namespaceId: dataSourceInfo.namespaceId || "",
            tenant: dataSourceInfo.namespaceId || "",
        }

        // 有配置项，保存，反之删除
        if(doc && doc.configs && doc.configs.length > 0){
            params.content = this.appCore.yamlUtils.JSONToYaml(doc);
            await this.appCore.axios.post(url, qs.stringify(params));
        } else {
            await this.appCore.axios.delete(url, { params });
        }
    }

    async invokeMethod(dataSourceInfo, serviceInfo, provder, methodInfo, code, invokerType) {
        return this.appCore.getInvoke('adapter').invokeMethod(provder, methodInfo, code, invokerType);
    }
    
    async getConfig(dataSourceInfo, dataId){
        // http://127.0.0.1:8848/nacos/v1/cs/configs
        const url = `${dataSourceInfo.address}/nacos/v1/cs/configs`;

        const params = {
            dataId: dataId,
            group: dataSourceInfo.group || 'dubbo', 
            namespaceId: dataSourceInfo.namespaceId || "",
            tenant: dataSourceInfo.namespaceId || "",
            show: 'all'
        }

        const response = await this.appCore.axios.get(url, { params  })
        if(response.data && response.data.content){
            return response.data.content;
        }
        return null;  
    }


    buildMataDataPath(providerInfo) {
        let { application, serviceName, version, group } = providerInfo;
        return `${serviceName}:${version || ""}:${group || ''}:provider:${application}`;
    }

    buildDataId(providerInfo) {
        let { serviceName, version, group } = providerInfo;
        return `${serviceName}:${version || ""}:${group || ''}.configurators`;
    }


    parseProvderInfo(data) {
        let metadata = data.metadata || [];

        return {
            application: metadata.application,
            protocol: metadata.protocol,
            ip: data.ip,
            port: data.port,
            address: `${data.ip}:${data.port}`,
            serviceName: metadata.interface,
            methods: metadata.methods.split(","),
            generic: metadata.generic,
            version: metadata.version,
            revision: metadata.revision,
            dubboVersion: metadata.release,
            deprecated: metadata.deprecated,
            weight: data.weight,
            enabled: data.enabled,
            group: metadata.group,
            // 2.7x就是dubbo端口，3.0之后是指定的端口
            qosPort: data.qosPort || data.port
        };
    }


}


export default NacosDataSource;