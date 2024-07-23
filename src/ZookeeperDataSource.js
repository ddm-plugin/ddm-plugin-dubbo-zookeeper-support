import zookeeperClient  from "node-zookeeper-client";
import zkClientUtils    from "./ZookeeperClientUtils";


const PRIVDER_PREFIX = "/dubbo";

let appCore = null;
let urlUtils = null;
let yamlUtils = null;
let dubboConfigrationUtils = null;

class ZookeeperDataSource {


  constructor(app) {
    appCore = app;
    urlUtils = appCore.urlUtils;
    yamlUtils = appCore.yamlUtils;
    dubboConfigrationUtils = appCore.dubboConfigrationUtils;
    this.name = "Zookeeper";
    // 可用的执行器列表，如果不填则为全部
    this.invokerTypeList = ['java', 'telnet']
  }

  
  async getFormConfig() {
    
    return  {
      properties: [{
          label: appCore.t('connect.address'),			// 显示名称，如果不存在，取name
          name: "address",		 // 配置key名称
          type: "input",			 // 交互类型：input、password、select、switch
          required: true, 
          placeholder: appCore.t('connect.address'),
          default: '127.0.0.1:2181',
      },
      {
        label: 'ACL',			// 显示名称，如果不存在，取name
        name: "auth",		 // 配置key名称
        type: "selectAndInput",			 // 交互类型：input、password、select、switch、selectAndInput
        required: true, 
        placeholder: appCore.t('connect.zookeeper.aclTips'),
        default: '',
        selectName: "scheme",
        defaultSelect:'auth',
        choices: [
          { name: 'digest', value: 'digest'},
          { name: 'auth', value: 'auth'}
        ],
      },
      {
          label: appCore.t('connect.sessionTimeout'),			// 显示名称，如果不存在，取name
          name: "sessionTimeout",		 // 配置key名称
          type: "input",			 // 交互类型：input、password、select、switch
          required: true, 
          default: "5000",
      }],
    }
  }

  async getServiceList(registryConfig) {
    const children = await zkClientUtils.getChildren(registryConfig, PRIVDER_PREFIX);
    return children.map(e => { 
      return { name: e, serviceName: e, type: 'dubbo' }
    });
  }


  async getProviderList(serviceName, registryConfig) {
    const path = `${PRIVDER_PREFIX}/${serviceName}/providers`;

    const children = await zkClientUtils.getChildren(registryConfig, path);

    const array = [];
    for (let i = 0; i < children.length; i++) {
      let providerInfo = this.parseProvderInfo(children[i]);
      let disableInfo = await this.getDisableInfo(registryConfig, providerInfo);
      if (disableInfo && disableInfo.find(item => item === '0.0.0.0' || item === providerInfo.address)) {
        providerInfo.disabled = true;
        providerInfo.disabledType = "service";
      }

      const metadata = await this.getMetaData(providerInfo, registryConfig);
      const methodList = [];
      if(metadata){
        providerInfo.metadata = metadata;
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
            parameterTypes: null,
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


  async getConsumerList(serviceName, registryConfig) {
    const path = `${PRIVDER_PREFIX}/${serviceName}/consumers`;

    const children = await zkClientUtils.getChildren(registryConfig, path);
    return children.map(data => this.parseConsumerInfo(decodeURIComponent(data)));
  }


  // 获取元数据信息
  async getMetaData(providerInfo, registryConfig) {
    const { application, serviceName, version } = providerInfo;
    const path = `/dubbo/metadata/${serviceName}/${version}/provider/${application}`;
    
    const data = await zkClientUtils.getData(registryConfig, path);
    return data ? JSON.parse(data) : null;
  }

  async disableProvider(registryConfig, providerInfo) {
    try {
        let doc = this.getCurrentConfiguration(registryConfig, providerInfo);

        doc = await dubboConfigrationUtils.addOrUpdateConfigration(doc, providerInfo.address);

        await this.getRealRegistry(registryConfig).saveConfiguration(registryConfig, providerInfo, doc);
    } catch (error) {
        throw new Error(i18n.t("connect.disableProviderError", {e: error}));
    }
}

async enableProvider(registryCenterId, providerInfo) {
    try {
        let registryConfig = await this.getDataSourceInfo(registryCenterId);

        let doc = await this.getRealRegistry(registryConfig).getCurrentConfiguration(registryConfig, providerInfo);

        doc = await dubboConfigrationUtils.deleteConfigration(doc, providerInfo.address);

        await this.getRealRegistry(registryConfig).saveConfiguration(registryConfig, providerInfo, doc);
    } catch (error) {
        throw new Error(i18n.t("connect.enableProviderError", {e: error}));
    }
}


  async getCurrentConfiguration(registryConfig, providerInfo) {

    let config = await this.getConfiguration(registryConfig, providerInfo);

    let configData = yamlUtils.yamlToJSON(config)

    return configData || yamlUtils.createDubboDefaultConfiguration(providerInfo.serviceName);
  }


  async getConfiguration(registryConfig, providerInfo) {
    let zk = await zkClientUtils.createConncetion(registryConfig);

    let { serviceName, version } = providerInfo;
    let path = this.getPath(serviceName, version);

    const config = await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-unused-vars
      zk.getData(path, async function(error, data, stat) {

        if (error) {
          // 不存在节点，那么创建一个默认对象
          if (error.code == -101) {
            resolve(null);
            return;
          }
          reject(error);
          return;
        }

        resolve(data.toString("utf8"));
      });
    });

    // 不存在，生成默认的yam
    return config || yamlUtils.JSONToYaml(yamlUtils.createDubboDefaultConfiguration(this.provider.serviceName));

  }


  async saveConfiguration(registryConfig, providerInfo, doc) {

    const doc = yamlUtils.yamlToJSON(ymal);
    let zkClient = await zkClientUtils.createConncetion(registryConfig);
    let { serviceName, version } = providerInfo;
    let path = this.getPath(serviceName, version);


    // 如果没有配置，那么就删除他 
    if (!doc || !doc.configs || doc.configs.length == 0) {
      zkClient.remove(path, -1, function(error) {
        // 不存在，忽略即可
        if (error && error.code == -101) return;
        if (error) {
          throw error;
        }
      });
      return;
    }

    // 更新
    // eslint-disable-next-line no-unused-vars
    zkClient.setData(path, Buffer.from(yamlUtils.JSONToYaml(doc)), -1, function (error, stat) {
      if (error && error.code == -101) {
        // eslint-disable-next-line no-unused-vars
        zkClient.create(path, Buffer.from(yamlUtils.JSONToYaml(doc)), zookeeperClient.CreateMode.PERSISTENT, function(error, stat) {
          if (error) {
            throw error;
          }
        });
        return;
      }
    });

  }


  /**
   * 
   * @param {string} serviceName 
   * @param {string[]} versions 多个版本
   */
  async getDisableInfo(registryConfig, providerInfo) {
    let doc = await this.getCurrentConfiguration(registryConfig, providerInfo);
    let addressList = [];
    if (doc && doc.configs) {
      let configs = doc.configs;
      for (let j = 0; j < configs.length; j++) {
        let config = configs[j];
        // 规则不是开启的，忽略
        if (!config.enabled) {
          continue;
        }

        if (!config.parameters || !config.parameters.disabled || config.parameters.disabled != true) {
          continue;
        }

        addressList = addressList.concat(config.addresses);
      }
    }

    return addressList;
  }


  getPath(serviceName, version) {
    return `/dubbo/config/dubbo/${serviceName}:${version ? version : ""}:.configurators`;
  }



  parseProvderInfo(data) {
    let content = decodeURIComponent(data);
    let urlData = urlUtils.parseURL(content);
    return {
      application: urlData.params.application,
      protocol: urlData.protocol,
      ip: urlData.host,
      port: urlData.port,
      address: `${urlData.host}:${urlData.port}`,
      serviceName: urlData.params.interface,
      methods: urlData.params.methods.split(","),
      generic: urlData.params.generic,
      version: urlData.params.version,
      revision: urlData.params.revision,
      dubboVersion: urlData.params.release,
      deprecated: urlData.params.deprecated,
      weight: urlData.params.weight,
      enabled: urlData.params.enabled,
      qosPort: urlData.params["qos.port"]
    };
  }

  parseConsumerInfo(data) {
    let urlData = urlUtils.parseURL(data);
    let methods = urlData.params.methods || "";
    return {
      ip: urlData.host,
      serviceName: urlData.params.interface,
      application: urlData.params.application,
      check: urlData.params.check,
      version: urlData.params.version,
      timeout: urlData.params.timeout,
      enable: urlData.params["qos.enable"],
      revision: urlData.params.revision,
      methods: methods.split(","),
      dubbo: urlData.params.dubbo,
      lazy: urlData.params.lazy,
      pid: urlData.params.pid,
      release: urlData.params.release,
      retries: urlData.params.retries || 2,
      sticky: urlData.params.sticky,
      category: urlData.params.category,
      timestamp: urlData.params.timestamp,
    };
  }

  async invokeMethod(registryConfig, provder, methodInfo, code, invokerType) {
    return await appCore.getInvoke('adapter').invokeMethod(provder, methodInfo, code, invokerType);
  }


  

}



export default ZookeeperDataSource;