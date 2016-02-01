'use strict';

/**
 * @ngdoc function
 * @name PoapServer.controller:DashboardCtrl
 * @description
 * # MainCtrl
 * Controller of the PoapServer
 */
angular.module('PoapServer')
    .controller('FabricInstanceCtrl', function($scope, $location, $filter, ngTableParams, appSettings, appServices, gettextCatalog, lclStorage, $modal, $log, $timeout, roundProgressService, ngToast) {
        /* When we enter tha app we need to remove the background from the login page and include headers and footers*/
        appServices.setInternalAppUI($scope)

        var parent = $scope.$parent;

        $scope.totalItems = 64;
        $scope.currentPage = 4;

        $scope.maxSize = 5;
        $scope.bigTotalItems = 175;
        $scope.bigCurrentPage = 1;

        $scope.animationsEnabled = true;
        $scope.fabricInstances = [];

        $scope.animationsEnabled = true;

        $scope.tableParams = new ngTableParams({
            page: 1,
            count: appSettings.tableSettings.count,
            sorting: {
                "name": "asc"
            },
            filter : {
                name : $scope.searchKeyword
            }
        }, {
            counts:[],
            getData: function($defer, params) {
                appServices.tablePagination($defer, $filter, params, $scope.fabricInstances, $scope.searchKeyword);
            }
        });

        $scope.$watch("searchKeyword", function () {
            $scope.tableParams.reload();
            $scope.tableParams.page(1);
        });

        $scope.checkAll = function(event) {
           $scope.isChecked = $(event.toElement).is(':checked');
        };

        $scope.getFabricInstanceList = function(callback) {
            appServices.doAPIRequest(appSettings.appAPI.fabricInstance.list, null, null).then(function(data) {
                $scope.fabricInstances = data;
                $scope.totalFabricInstances = $scope.fabricInstances.length;
                $scope.tableParams.reload();
            });
        };


        $scope.addFabric = function() {
          $scope.action = "add";
          $scope.selectedId = null;
          $scope.openCreateModal();
        };

        $scope.openCreateModal = function() {
            $scope.modalInstance = $modal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'pages/template/modal/addFabricModal.html',
                controller: 'FabricCreateCtrl',
                size: 'lg',
                backdrop: 'static',
                resolve: {
                    dataToModal : function() {
                        return {
                            action : $scope.action,
                            callerScope : $scope
                        }
                    }
                 }
            });
            $scope.modalInstance.result.then(function(modalData) {
                $scope.submitData(modalData);
            }, function() {
                $log.info('Modal dismissed at: ' + new Date());
            });
        };



        $scope.deleteFabricInstance = function(id, $index) {
        $scope.selectedId = id;

        var modalInstance = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'pages/template/modal/deleteModal.html',
            controller: 'AlertModalCtrl',
            size: 'md',
            resolve: {
                dataToModal : function() {
                    return {
                        id : $scope.selectedId,
                        action: 'delete',
                        message: 'Are you sure you want to delete the fabric?',
                        callerScope : $scope
                    }
                }
             }
        });

        modalInstance.result.then(function(modalData) {
            $scope.submitData(modalData);
        }, function() {
            $log.info('Modal dismissed at: ' + new Date());
        });
        $scope.init();
    };

    $scope.cloneFabricInstance = function(id) {
      $scope.action = "clone";
      $scope.selectedId = id;
      $scope.openCloneModal();
    }

    $scope.openCloneModal = function(size) {console.log('Inside Open Clone');
        var modalInstance = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'pages/template/modal/cloneModal.html',
            controller: 'FabricInstanceCloneModalCtrl',
            size: 'sm',
            resolve: {
                dataToModal : function() {
                    return {
                        action : $scope.action,
                        id : $scope.selectedId
                    }
                }
             }
        });

        modalInstance.result.then(function(modalData) {
            $scope.submitData(modalData);
        }, function() {
            $log.info('Modal dismissed at: ' + new Date());
        });

    };

    $scope.submitData = function(modalData) {
        if(modalData.action == 'add') {
            appServices.doAPIRequest(appSettings.appAPI.fabricInstance.add,modalData.submitData,null).then(function(data){
                /*localStorage.fabricId = JSON.stringify(data.id);
                localStorage.source = 'fabric';*/
                $location.path('/fabricInstance/edit/'+data.id);
            });
        } else if(modalData.action == 'delete') {

            var reqHeader = {
                appendToURL : true,
                value : $scope.selectedId,
                noTrailingSlash : true
            };

            appServices.doAPIRequest(appSettings.appAPI.fabricInstance.delete, null, reqHeader).then(function(data) {
                /* TODO after delete success */
                ngToast.create({
                  className: 'success',
                  content: 'Fabric Instance Deleted Successfully.'
                });
                $scope.init('delete');
            });
        }
        else if (modalData.action == 'clone') {
          var dataToSubmit = modalData.submitData;
          var requestHeader = {
            appendToURL: true,
            /* TODO - change to true in server */
            value: $scope.selectedId,
            noTrailingSlash: true
          };
          appServices.doAPIRequest(appSettings.appAPI.fabricInstance.getById, null, requestHeader).then(function(data) {
            $log.debug('Data Fetched for FabricInstance Id : ' + $scope.selectedId);
            $log.debug(data);
            var newFabricInstance = angular.copy(data);$log.debug('DATA::');$log.debug(data);
            newFabricInstance.id = '';
            newFabricInstance.name = modalData.submitData.NewCloneName;console.log('New FI');console.log(newFabricInstance);
            newFabricInstance.submit = "false";
            newFabricInstance.topology_id = newFabricInstance.topology.topology_id;

            newFabricInstance.image_details.switch_image_profile=[];
            newFabricInstance.system_id = [];
            newFabricInstance.config_json.switch_config_id=[];

            appServices.doAPIRequest(appSettings.appAPI.fabricInstance.add, newFabricInstance, null).then(function(data) {
                /* TODO after delete success */
                ngToast.create({
                  className: 'success',
                  content: 'FabricInstance Cloned Successfully.'
                });
                $scope.init('cloned');
            });
          });
        }
    };

        $scope.init = function() {
          $scope.getFabricInstanceList();
        }

        $scope.init();

});

angular.module('PoapServer').controller('FabricInstanceCloneModalCtrl', function($scope, $modalInstance, appSettings, appServices, dataToModal) {

    $scope.action = dataToModal.action;
    $scope.id = dataToModal.id;
    $scope.submitData = {
      "NewCloneName" : ""
    }

    $scope.ok = function() {
        $modalInstance.close({
            submitData : $scope.submitData,
            action : $scope.action,
            id : $scope.id
        });
    };

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };

    $scope.init = function() {};

    $scope.init();
  });

angular.module('PoapServer').controller('FabricCreateCtrl',
      function($scope, $modalInstance, appSettings, appServices, dataToModal){
        $scope.action = dataToModal.action;
        $scope.configEdit=true;
        $scope.selectList = {
          'config_list' : [],
          'fabricProfile_list' : [],
          'topology_list' : []
      };
        $scope.submitData = {
            'name': '',
            'topology': '',
            'switches': [
                { 'tier': 'Core', 'config_profile': 0, 'feature_profile': 0, 'workflow': 0 },
                { 'tier': 'Spine', 'config_profile': 0, 'feature_profile': 0, 'workflow': 0 },
                { 'tier': 'Leaf', 'config_profile': 0, 'feature_profile': 0, 'workflow': 0 },
                { 'tier': 'Border', 'config_profile': 0, 'feature_profile': 0, 'workflow': 0 }
            ]
        };

        $scope.isObjectEmpty = function(object) {
          if(object === undefined || object === null || object === '' || object.length === 0){
              return true;
          }
          return false;
        };

        $scope.init = function() {
            var reqHeader = {
                appendToURL : true,
                value : '?submit=true',
                noTrailingSlash : true
            };

            var defaultVal = {"id" : 0, "name" : "--None--"};
            appServices.doAPIRequest(appSettings.appAPI.topology.list, null, reqHeader).then(function(data) {
                $scope.selectList.topology_list = data;
                $scope.selectList.topology_list.unshift({id:'',name:'--Select--'});
            });
            appServices.doAPIRequest(appSettings.appAPI.workflow.list, null, reqHeader).then(function(data) {
                $scope.selectList.workflow_list = data;
                $scope.selectList.workflow_list.unshift(defaultVal);
            });
            appServices.doAPIRequest(appSettings.appAPI.configuration.list, null, reqHeader).then(function(data) {
                $scope.selectList.config_list = data;
                $scope.selectList.config_list.unshift(defaultVal);
                appServices.doAPIRequest(appSettings.appAPI.fabricProfile.list, null, reqHeader).then(function(data) {
                    $scope.selectList.fabricProfile_list = data;
                    $scope.selectList.fabricProfile_list.unshift(defaultVal);
                    for(var index = 0; index < $scope.submitData.switches.length; index++) {
                        if(undefined !== $scope.addFabricForm["config_profile"+index]){
                            $scope.addFabricForm["config_profile"+index].$setValidity('required',false);
                            $scope.addFabricForm["feature_profile"+index].$setValidity('required',false);   
                        }
                    }
                    $('.profile-note').addClass('noteHighlight');
                });
            });
        };

        $scope.checkTierValidity = function(index) {
            if(0 == $scope.submitData.switches[index].config_profile && 0 == $scope.submitData.switches[index].feature_profile) {
                $scope.addFabricForm["config_profile"+index].$setValidity('required',false);
                $scope.addFabricForm["feature_profile"+index].$setValidity('required',false);
                $('.profile-note').addClass('noteHighlight');
            } else {
                $scope.addFabricForm["config_profile"+index].$setValidity('required',true);
                $scope.addFabricForm["feature_profile"+index].$setValidity('required',true);
                $('.profile-note').removeClass('noteHighlight');
            }
        };

        $scope.ok = function() {
          $modalInstance.close({
                submitData : $scope.submitData,
                action : $scope.action
            });
        };

        $scope.cancel = function() {
            $modalInstance.dismiss('cancel');
        };

        $scope.init();
  });