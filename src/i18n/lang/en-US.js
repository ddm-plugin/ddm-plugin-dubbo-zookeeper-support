export default {
    connect: {
        zookeeper: {
            address: "address",
            sessionTimeout: "timeout",
            aclTips: "Enter the authentication information, for example, test:test"
        },

        nacos: {
            address: "address",
            namespaceId: "namespaceId",
            sessionTimeout: "timeout",
            username: "username",
            password: "password",
            groupName: 'ServiceGroupName',
            groupNameTips: 'Enter the name of the service GROUP. The DEFAULT is DEFAULT GROUP',
            group: 'ConfiguringGroupName',
            groupTips: 'Please enter the configuration group name. The default is dubbo',
        },

        dubboAdmin: {
            address: "address",
            sessionTimeout: "timeout",
            username: "username",
            password: "password",
        }
    }
}