var app = angular.module('Perks', ['ui.bootstrap','ui.utils','ui.router','ngAnimate']);

app.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('home', {
      url: '/home',
      templateUrl: 'home.html',
      controller: 'HomeController'
    });

  /* Add New States Above */
  $urlRouterProvider.otherwise('/home');
});

app.controller('HomeController', function($scope, $http){

  $scope.points = 0
  $scope.suits  = [];
  $scope.perks  = [];
  $scope.group  = "cost";
  $scope.currentSuit = null;

  $http.get('data.json')
    .then(function(response){
      $scope.perks = response.data.perks;
      $scope.suits = response.data.suits;
      $scope.currentSuit = $scope.suits[0];
      $scope.groupedPerks = _.groupBy($scope.perks, $scope.group);

      _.each($scope.suits, function(suit){
        suit.level = 40;
        $scope.$watch(function(){ return suit.level; }, function(){
          $scope.updatePerkAvailability();
        })
      })

      $scope.updatePerkAvailability();
    });

  $scope.selectSuit = function(suit){
    $scope.currentSuit = suit;
    $scope.refreshPerkAvailability();
  }

  $scope.regroup = function(key) {
    $scope.groupedPerks = _.groupBy($scope.perks, key);
  }

  $scope.selectPerk = function(perk) {
    if (perk.selected) {
      return;
    }

    $scope.points += perk.cost;
    perk.selected = true;
  }

  $scope.deselectPerk = function(perk) {
    if (!perk.selected) {
      return;
    }

    $scope.points -= perk.cost;
    delete perk.selected;
  }

  $scope.updatePerkAvailability = function() {

    _.each($scope.perks, function(perk){
      var frame = _.findWhere($scope.suits, { name: perk.frame });
      if (!perk.universal && $scope.currentSuit.name != perk.frame) {
        perk.available = false;
        return;
      }

      if (frame.level < perk.level) {
        perk.available = false;
        return;
      }

      perk.available = true;
      console.log(perk.available);
    });
  }
});


app.run(function($rootScope) {
  $rootScope.safeApply = function(fn) {
    var phase = $rootScope.$$phase;
    if (phase === '$apply' || phase === '$digest') {
      if (fn && (typeof(fn) === 'function')) {
        fn();
      }
    } else {
      this.$apply(fn);
    }
  };
});
