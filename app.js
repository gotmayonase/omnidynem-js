var app = angular.module('Perks', ['ui.utils','ui.router','ngAnimate']);

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


  $scope.points = 0;
  $scope.suits  = [];
  $scope.perks  = [];
  $scope.group  = "cost";
  $scope.currentSuit = null;

  var maxPoints = 10;
  var defaultDataPoint = {
    id:    999,
    value: $scope.maxPoints,
    color: '#000000'
  }

  $scope.$watch('points', function(points){
    defaultDataPoint.value = (maxPoints - points);
  })

  var COLOR_MAP = {
    1: '#9b59b6',
    5: '#3498db',
    8: '#e67e22'
  }

  $scope.donut = [defaultDataPoint];

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
        });
      });

      $scope.updatePerkAvailability();
    });

  $scope.selectSuit = function(suit){
    $scope.currentSuit = suit;
    $scope.refreshPerkAvailability();
  };

  $scope.regroup = function(key) {
    $scope.group = key;
    $scope.groupedPerks = _.groupBy($scope.perks, key);
  };

  $scope.togglePerk = function(perk) {
    if (!perk.available) {
      return;
    }

    if (perk.selected) {
      $scope.points -= perk.cost;
      delete perk.selected;

      var dataPoint = _.findWhere($scope.donut, { id: perk.id });
      var index = $scope.donut.indexOf(dataPoint);
      if (index != -1) $scope.donut.splice(index, 1);
    }
    else
    {
      if (perk.cost > defaultDataPoint.value)
        return;

      $scope.points += perk.cost;
      perk.selected = true;

      $scope.donut.push({
        id: perk.id,
        color: COLOR_MAP[perk.cost],
        value: perk.cost
      })
    }
  };

  $scope.updatePerkAvailability = function() {

    _.each($scope.perks, function(perk){
      var frame = _.findWhere($scope.suits, { name: perk.frame });
      if (!perk.universal && $scope.currentSuit.name !== perk.frame) {
        perk.available = false;

        if (perk.selected) {
          $scope.points -= perk.cost;
          perk.selected = false;
        }

        return;
      }

      if (frame.level < perk.level) {
        perk.available = false;

        if (perk.selected) {
          $scope.points -= perk.cost;
          perk.selected = false;
        }

        return;
      }

      perk.available = true;
    });
  };
});

app.directive('angChartjsDoughnut', function(){
  var compilationFunction = function (templateElement, templateAttributes, transclude) {
    if (templateElement.length === 1) {
      var node = templateElement[0];

      var width = node.getAttribute('data-chartjs-width') || '400';
      var height = node.getAttribute('data-chartjs-height') || '400';

      var canvas = document.createElement('canvas');
      canvas.setAttribute('width', width);
      canvas.setAttribute('height', height);
      canvas.setAttribute('data-chartjs-model', node.getAttribute('data-chartjs-model'));

      var options = {};

      var potentialOptions = [
        {key:'data-chartjs-segment-show-stroke', value:'segmentShowStroke', isBoolean: true},
        {key:'data-chartjs-segment-stroke-color', value:'segmentStrokeColor'},
        {key:'data-chartjs-segment-stroke-width', value:'segmentStrokeWidth', isNumber: true},
        {key:'data-chartjs-percentage-inner-cutout', value:'percentageInnerCutout', isNumber: true},
        {key:'data-chartjs-animation', value:'animation', isBoolean: true},
        {key:'data-chartjs-animation-steps', value:'animationSteps', isNumber: true},
        {key:'data-chartjs-animation-easing', value:'animationEasing'},
        {key:'data-chartjs-animate-rotate', value:'animateRotate', isBoolean: true},
        {key:'data-chartjs-animate-scale', value:'animateScale', isBoolean: true}
      ];

      for (var i = 0; i < potentialOptions.length; i++) {
        var aKey = node.getAttribute(potentialOptions[i].key);
        if (aKey && potentialOptions[i].isBoolean) {
          if ('true' === aKey) {
            options[potentialOptions[i].value] = true;
          } else if ('false' === aKey) {
            options[potentialOptions[i].value] = false;
          }
        } else if (aKey && potentialOptions[i].isNumber) {
          options[potentialOptions[i].value] = parseInt(aKey);
        }else if (aKey) {
          options[potentialOptions[i].value] = aKey;
        }
      }

      var chart = new Chart(canvas.getContext('2d'));
      node.parentNode.replaceChild(canvas, node);

      return {
        pre: function preLink(scope, instanceElement, instanceAttributes, controller) {
          var expression = canvas.getAttribute('data-chartjs-model');
          scope.$watch(expression, function (newValue, oldValue) {
            if (angular.isArray(newValue)){
              var callback = scope[node.getAttribute('data-chartjs-on-animation-complete')];
              if (callback !== undefined) {
                options.onAnimationComplete = callback;
              }

              chart.Doughnut(newValue, options);
            }
          }, true);
        },
        post: function postLink(scope, instanceElement, instanceAttributes, controller) {}
      };
    }
  };

  var chartjsDoughnut = {
    compile: compilationFunction,
    replace: true
  };
  return chartjsDoughnut;
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
