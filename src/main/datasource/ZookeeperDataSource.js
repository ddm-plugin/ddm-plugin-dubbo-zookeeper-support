import urlUtils                   from "@/common/UrlUtils";
import yamlUtils                  from "@/common/YamlUtils";
import zkClientUtils              from "./ZookeeperClientUtils";
import dubboConfigurationUtils    from "@/common/DubboConfigurationUtils";

const PRIVDER_PREFIX = "/dubbo";

let appCore = null;

class ZookeeperDataSource {

  constructor(app) {
    appCore = app;
    this.name = "Zookeeper";
    // 可用的执行器列表，如果不填则为全部
    this.invokerTypeList = ['java', 'telnet']
  }


  async getFormConfig() {
    return {
      initializeObject: {
        source: "dubbo-zookeeper",
      },
      properties: [{
          label: appCore.t('connect.zookeeper.address'),
          name: "address",
          type: "input",
          required: true,
          placeholder: appCore.t('connect.zookeeper.address'),
          default: '127.0.0.1:2181',
        },
        {
          label: 'ACL',
          name: "auth",
          type: "selectAndInput",
          required: true,
          placeholder: appCore.t('connect.zookeeper.aclTips'),
          default: '',
          selectName: "scheme",
          defaultSelect: 'auth',
          choices: [{
              name: 'digest',
              value: 'digest'
            },
            {
              name: 'auth',
              value: 'auth'
            }
          ],
        },
        {
          label: appCore.t('connect.zookeeper.sessionTimeout'),
          name: "sessionTimeout",
          type: "input",
          required: true,
          default: "5000",
        }
      ],
    }
  }

  async getServiceList(dataSourceInfo) {
    const children = await zkClientUtils.getChildren(dataSourceInfo, PRIVDER_PREFIX);

    const exculdeName = ["mapping", "config", "metadata"]
    const serviceList = children.filter(e => !exculdeName.find(name => name == e)).map(e => {
      return {
        serviceName: e,
        uniqueServiceName: e,
        type: 'dubbo'
      }
    })

    return {
      list: serviceList,
      separator: '.',
      packageSeparator: '.'
    };
  }

  async getProviderList(dataSourceInfo, serviceInfo) {
    const path = `${PRIVDER_PREFIX}/${serviceInfo.serviceName}/providers`;

    const children = await zkClientUtils.getChildren(dataSourceInfo, path);

    const serviceDisabledMap = new Map();
    const serviceMatadataMap = new Map();

    const array = [];
    for (let i = 0; i < children.length; i++) {
      let providerInfo = this.parseProvderInfo(children[i]);

      // 服务是否被禁用
      const disabledAddresses = await serviceDisabledMap.computeIfAbsent(this.buildConfigurationPath(providerInfo), async () => dubboConfigurationUtils.getDisableAddresses(await this.getJsonConfiguration(dataSourceInfo, providerInfo)))
      providerInfo.disabled = disabledAddresses.find(item => item === '0.0.0.0' || item === providerInfo.address) != null;

      const metadata = await serviceMatadataMap.computeIfAbsent(this.buildMataDataPath(providerInfo), async (path) => await zkClientUtils.getJsonData(dataSourceInfo, path));
      const methodList = [];
      if (metadata) {
        metadata.methods.forEach(method => {
          methodList.push({
            ...method,
            defaultParameter: JSON.stringify(appCore.getParamGenerator().generateParam(metadata, method.name), null, 2) || "[]",
          });
        })
      } else {
        providerInfo.methods.forEach(method => {
          methodList.push({
            name: method,
            parameterTypes: [],
            defaultParameter: "[]",
            returnType: null
          });
        });
      }
      providerInfo.methods = methodList;

      array.push(providerInfo);
    }
    return array;
  }

  async getConsumerList(dataSourceInfo, serviceInfo) {
    const path = `${PRIVDER_PREFIX}/${serviceInfo.serviceName}/consumers`;

    const children = await zkClientUtils.getChildren(dataSourceInfo, path);
    return children.map(data => this.parseConsumerInfo(decodeURIComponent(data)));
  }


  async disableProvider(dataSourceInfo, serviceInfo, providerInfo) {
    let doc = await this.getJsonConfiguration(dataSourceInfo, providerInfo);

    doc = await dubboConfigurationUtils.addDisableProvider(doc, providerInfo.address);

    await this.doSaveConfiguration(dataSourceInfo, providerInfo, doc);
  }

  async enableProvider(dataSourceInfo, serviceInfo, providerInfo) {
    let doc = await this.getJsonConfiguration(dataSourceInfo, providerInfo);

    doc = await dubboConfigurationUtils.removeDisableProvider(doc, providerInfo.address);

    await this.doSaveConfiguration(dataSourceInfo, providerInfo, doc);
  }

  async getConfiguration(dataSourceInfo, serviceInfo, providerInfo) {
    const config = await zkClientUtils.getData(dataSourceInfo, this.buildConfigurationPath(providerInfo));
    return config ? config : yamlUtils.JSONToYaml(dubboConfigurationUtils.createDubboDefaultConfiguration());
  }
  
  async getJsonConfiguration(dataSourceInfo, providerInfo) {
    return yamlUtils.yamlToJSON(await this.getConfiguration(dataSourceInfo, providerInfo));
  }

  async saveConfiguration(dataSourceInfo, serviceInfo, providerInfo, ymal) {
    await this.doSaveConfiguration(dataSourceInfo, providerInfo, yamlUtils.yamlToJSON(ymal));
  }

  
  async invokeMethod(dataSourceInfo, serviceInfo, provder, methodInfo, code, invokerType) {
    return await appCore.getInvoke('adapter').invokeMethod(provder, methodInfo, code, invokerType);
  }


  async doSaveConfiguration(dataSourceInfo, providerInfo, doc) {
    // 如果没有配置，那么就删除他 
    if (!doc || !doc.configs || doc.configs.length == 0) {
      await zkClientUtils.remove(dataSourceInfo,this.buildConfigurationPath(providerInfo));
      return;
    }

    await zkClientUtils.setData(dataSourceInfo, this.buildConfigurationPath(providerInfo), Buffer.from(yamlUtils.JSONToYaml(doc)));
  }

  buildMataDataPath(providerInfo) {
    const {
      application,
      serviceName,
      version
    } = providerInfo;
    return `/dubbo/metadata/${serviceName}/${version}/provider/${application}`;
  }

  buildConfigurationPath(providerInfo) {
    let {
      serviceName,
      version
    } = providerInfo;
    return `/dubbo/config/dubbo/${serviceName}:${version ? version : ""}:.configurators`;
  }

  parseProvderInfo(data) {
    let content = decodeURIComponent(data);
    let urlData = urlUtils.parseURL(content);
    return {
      application: urlData.params.application,
      ip: urlData.host,
      port: urlData.port,
      address: `${urlData.host}:${urlData.port}`,
      serviceName: urlData.params.interface,
      uniqueServiceName: urlData.params.interface,
      version: urlData.params.version,
      weight: urlData.params.weight,

      deprecated: urlData.params.deprecated,
      protocol: urlData.protocol,
      methods: urlData.params.methods.split(","),
      generic: urlData.params.generic,
      providerVersion: urlData.params.revision,
      dubboVersion: urlData.params.release,
      // enabled: urlData.params.enabled,
      qosPort: urlData.params["qos.port"]
    };
  }

  parseConsumerInfo(data) {
    let urlData = urlUtils.parseURL(data);
    let methods = urlData.params.methods || "";
    return {
      application: urlData.params.application,
      ip: urlData.host,
      serviceName: urlData.params.interface,
      disabled: false,  				 // 是否被禁用了
      timeout: urlData.params.timeout,
      version: urlData.params.version,
      retries: urlData.params.retries || 2,
      providerVersion: urlData.params.revision,
      dubboVersion: urlData.params.release,
      dubbo: urlData.params.dubbo,
      methods: methods.split(","),

      check: urlData.params.check,
      enable: urlData.params["qos.enable"],
      lazy: urlData.params.lazy,
      pid: urlData.params.pid,
      sticky: urlData.params.sticky,
      category: urlData.params.category,
      timestamp: urlData.params.timestamp,
    };
  }

}



export default ZookeeperDataSource;