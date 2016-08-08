tokenApp = angular.module('tokenApp', ['ui.router', 'ngMaterial', 'ngTable', 'ngAnimate', 'ngMessages']);

tokenApp.config([
    "$locationProvider",
    "$stateProvider",
    "$urlRouterProvider", "$mdThemingProvider",
    function ($locationProvider, $stateProvider, $urlRouterProvider, $mdThemingProvider) {
        $mdThemingProvider.definePalette('amazingPaletteName', {
            '50': 'ffebee',
            '100': 'ffcdd2',
            '200': 'ef9a9a',
            '300': 'e57373',
            '400': 'ef5350',
            '500': 'b8b8b8',
            '600': 'e53935',
            '700': 'd32f2f',
            '800': 'c62828',
            '900': 'b71c1c',
            'A100': 'ff8a80',
            'A200': 'ff5252',
            'A400': 'ff1744',
            'A700': 'd50000',
            'contrastDefaultColor': 'light',    // whether, by default, text (contrast)
                                                // on this palette should be dark or light
            'contrastDarkColors': ['50', '100', //hues which contrast should be 'dark' by default
                '200', '300', '400', 'A100'],
            'contrastLightColors': undefined    // could also specify this if default was 'dark'
        });
        $mdThemingProvider.theme('default')
            .primaryPalette('amazingPaletteName')
        $locationProvider.html5Mode({
            enabled: false,
            requireBase: false
        });
        $urlRouterProvider.otherwise("/login");
        $stateProvider
            .state('main', {
                abstract: true,
                templateUrl: "partials/app-template.html",
                controller: "appController"
            })
            .state('main.login', {
                url: "/login",
                templateUrl: "partials/login.html",
                controller: "loginController"
            })
            .state('main.tokens', {
                url: "/tokens",
                templateUrl: "partials/tokens.html",
                controller: "tokensController"
            })

    }
]);

tokenApp.run(function ($rootScope, $location, $state, authService, idFactory) {

    $rootScope.appID = idFactory;

    angular.element(document).on("click", function (e) {
        $rootScope.$broadcast("documentClicked", angular.element(e.target));
    });

    $rootScope.$on('$stateChangeStart', function (e, toState, toParams, fromState, fromParams) {

        var isLogin = toState.name === "main.login";
        if (isLogin || authService.isLogged) {
            return; // no need to redirect
        }
        e.preventDefault(); // stop current execution
        $state.go('main.login'); // go to login

    });
});
angular.module('tokenApp').controller('appController', [
    function () {

    }]);
angular.module('tokenApp').controller('loginController', ['authService', 'userService', '$scope',
    function (authService, userService, $scope) {
        $scope.pass = "";
        $scope.remember = true;
        $scope.login = function(pass, remember) {
            if (pass.trim() != ""){
                authService.setLogged(pass, remember);
            }
        }
    }]);

angular.module('tokenApp').controller('tokensController', ['userService', 'authService', '$scope', "$timeout", "ngTableParams", "$http", "$filter", "idFactory", "$mdDialog", "$mdMedia", "$state", "$timeout",
	function (userService, authService, $scope, $timeout, ngTableParams, $http, $filter, idFactory, $mdDialog, $mdMedia, $state, $timeout) {
		var user = userService.getUser();

		$scope.totalTokens = 0;

		$scope.logout = function () {
			$state.go('main.login');
		}

		function DialogController($scope, $mdDialog, $http, idFactory) {
			$scope.sending = false;
			$scope.error = '';
			$scope.secret = user.secret;
			$scope.newToken = {
				name: '',
				description: '',
				amount: 1,
				secret: user.secret
			}
			$scope.hide = function () {
				if (!$scope.sending) {
					$mdDialog.hide();
				}
			};
			$scope.cancel = function () {
				if (!$scope.sending) {
					$mdDialog.cancel();
				}
			};
			$scope.create = function () {
				if (!$scope.sending) {
					$scope.sending = true;
					$scope.error = '';
					$http.put('/api/dapps/' + idFactory + '/api/tokens', {
						secret: $scope.newToken.secret,
						name: $scope.newToken.name,
						description: $scope.newToken.description,
						fund: $scope.newToken.amount
					}).then(function (resp) {

						if (resp.data.success) {
							$mdDialog.hide(true);
						}
						else {
							$scope.sending = false;
							$scope.error = resp.data.error;
						}
					}.bind(this));
				}

			};
		};

		function SendDialog($scope, $mdDialog, $http, idFactory, token) {
			$scope.error = '';
			$scope.sending = false;
			$scope.secret = user.secret;
			$scope.transaction = {
				recipientId: '',
				amount: 1,
				secret: user.secret,
				token: token
			}
			$scope.hide = function () {
				if (!$scope.sending) {
					$mdDialog.hide();
				}
			};
			$scope.cancel = function () {
				if (!$scope.sending) {
					$mdDialog.cancel();
				}
			};
			$scope.send = function () {
				if (!$scope.sending) {
					$scope.error = '';
					$scope.sending = true;
					$http.put('/api/dapps/' + idFactory + '/api/transaction', {
						secret: $scope.transaction.secret,
						amount: $scope.transaction.amount,
						recipientId: $scope.transaction.recipientId,
						token: $scope.transaction.token
					}).then(function (resp) {

						if (resp.data.success) {
							$mdDialog.hide(true);
						}
						else {
							$scope.sending = false;
							$scope.error = resp.data.error;
						}
					}.bind(this));
				}

			};
		};


		$scope.status = '  ';
		$scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');

		$scope.showAdvanced = function (ev) {
			var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
			$mdDialog.show({
					clickOutsideToClose: false,
					controller: DialogController,
					templateUrl: 'partials/modals/createToken.html',
					parent: angular.element(document.body),
					targetEvent: ev,
					fullscreen: useFullScreen
				})
				.then(function (answer) {
					if (answer) {
						console.log('can update');
						$scope.updateBlocks();
					}

				}, function () {

				});
			$scope.$watch(function () {
				return $mdMedia('xs') || $mdMedia('sm');
			}, function (wantsFullScreen) {
				$scope.customFullscreen = (wantsFullScreen === true);
			});
		};

		$scope.sendAmount = function (ev, token, tokenId) {
			var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
			$mdDialog.show({
					clickOutsideToClose: false,
					controller: SendDialog,
					templateUrl: 'partials/modals/send.html',
					parent: angular.element(document.body),
					targetEvent: ev,
					fullscreen: useFullScreen,
					locals: {
						token: token
					}
				})
				.then(function (answer) {
					if (answer) {
						console.log('can update');
						$scope.updateBlocks();
					}

				}, function () {

				});
			$scope.$watch(function () {
				return $mdMedia('xs') || $mdMedia('sm');
			}, function (wantsFullScreen) {
				$scope.customFullscreen = (wantsFullScreen === true);
			});
		};


		function filterData(data, filter) {
			return $filter('filter')(data, filter)
		}

		function orderData(data, params) {
			return params.sorting() ? $filter('orderBy')(data, params.orderBy()) : filteredData;
		}

		function sliceData(data, params) {
			return data.slice((params.page() - 1) * params.count(), params.page() * params.count())
		}

		function transformData(data, filter, params) {
			return sliceData(orderData(filterData(data, filter), params), params);
		}

		var service = {
			cachedData: [],
			getData: function ($defer, params, filter) {
				if (false) {
					var filteredData = filterData(service.cachedData, filter);
					var transformedData = sliceData(orderData(filteredData, params), params);
					params.total(filteredData.length)
					$defer.resolve(transformedData);
				}
				else {
					$scope.fetch = true;
					$http.get('/api/dapps/' + idFactory + '/api/tokens', user.secret ? {secret: user.secret} : {}).success(function (resp) {
						angular.copy(resp.tokens, service.cachedData)
						params.total(resp.tokens.length)
						$scope.totalTokens = resp.tokens.length;
						var filteredData = $filter('filter')(resp.tokens, filter);
						var transformedData = transformData(resp.tokens, filter, params)
						$defer.resolve(transformedData);
					});
				}

			}
		};

		//tableTokens
		$scope.tableTokens = new ngTableParams({
			page: 1,
			count: 6,
			sorting: {
				balance: 'desc'
			}
		}, {
			total: 0,
			counts: [],
			getData: function ($defer, params) {
				service.getData($defer, params, $scope.filter);
			}
		});

		$scope.tableTokens.settings().$scope = $scope;

		$scope.$watch("filter.$", function () {
			$scope.tableTokens.reload();
		});

		$scope.updateBlocks = function () {
			console.log('updating...');
			$scope.tableTokens.reload();
		};

		//end tableTokens
		var setTimerToUpdate = function () {
			if ($state.is('main.tokens')) {
				$scope.updateBlocks();
				$timeout(setTimerToUpdate, 3000);
			}
		}

		$timeout(setTimerToUpdate, 3000);

	}]);



angular.module('tokenApp').factory('idFactory', ['$location',  function ($location) {
	var url = $location.absUrl();
	var parts = url.split('/');
	var dappId = parts[parts.indexOf('dapps') + 1];
	return dappId;
}]);
angular.module('tokenApp').service('authService', ['$state', 'idFactory', '$http', 'userService', function ($state, idFactory, $http, userService) {
	this.setLogged = function (secret, remember) {
		$http.post('/api/dapps/' + idFactory + '/api/openAccount', {
			secret: secret
		}).then(function (resp) {
			if (resp.data.success) {
				var user = resp.data.account;
				user.secret = remember ? secret: null;
				userService.setUser(user);

				this.isLogged = true;
				$state.go('main.tokens');
			}
		}.bind(this));
	}

	this.setUnlogged = function () {
		userService.clearUser();
		this.isLogged = false;
		$state.go('main.login');
	}
}]);

angular.module('tokenApp').service('tokenService', ['$scope', "$timeout", "idFactory", "$filter", "$http", "userService",
    function ($scope, $timeout, idFactory, $filter, $http, userService) {
         var user = userService.getUser();
            $scope.secret = user.secret;
            
        function filterData(data, filter){
            return $filter('filter')(data, filter)
        }

        function orderData(data, params){
            return params.sorting() ? $filter('orderBy')(data, params.orderBy()) : filteredData;
        }

        function sliceData(data, params){
            return data.slice((params.page() - 1) * params.count(), params.page() * params.count())
        }

        function transformData(data,filter,params){
            return sliceData( orderData( filterData(data,filter), params ), params);
        }

        var service = {
            cachedData:[],
            getData:function($defer, params, filter){
                if(service.cachedData.length>0){
                    console.log("using cached data")
                    var filteredData = filterData(service.cachedData,filter);
                    var transformedData = sliceData(orderData(filteredData,params),params);
                    params.total(filteredData.length)
                    $defer.resolve(transformedData);
                }
                else{
                    console.log("fetching data")
                    $http.post('/api/dapps/' + idFactory + '/api/tokens', $scope.secret?{secret: $scope.secret}:{}).success(function(resp)
                    {
                        angular.copy(resp,service.cachedData)
                        params.total(resp.length)
                        var filteredData = $filter('filter')(resp, filter);
                        var transformedData = transformData(resp,filter,params)
                        $defer.resolve(transformedData);
                    });
                }

            }
        };
        return service;
}]);



angular.module('tokenApp').service('userService', [function () {
    this.setUser = function (user) {
        this.user = user;
    }
    this.getUser = function () {
       return this.user;
    }
    this.clearUser = function () {
        delete this.user;
    }
}]);