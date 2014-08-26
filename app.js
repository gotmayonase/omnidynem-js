/*global Chart */
var app = angular.module('Perks', ['ui.utils','ui.router','mgcrea.ngStrap','ngAnimate']);

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


app.controller('HomeController', function($scope, $http, $filter){

  $scope.points = 0;
  $scope.max_points = 21;
  $scope.suits  = [];
  $scope.perks  = [];
  $scope.group  = "cost";
  $scope.selected_perks_count = 0;
  $scope.currentSuit = null;
  $scope.levels = {
    '1': 'Basic',
    '2': 'Intermediate',
    '5': 'Advanced',
    '8': 'Master'
  };

  var defaultDataPoint = {
    id:    999,
    value: $scope.max_points,
    color: '#000000'
  };

  $scope.$watch('points', function(points){
    defaultDataPoint.value = ($scope.max_points - points);
  });

  var COLOR_MAP = {
    Basic: '#95F285',
    Intermediate: '#F4F993',
    Advanced: '#8989F9',
    Master: '#FFB042'
  };

  var POINTS_PER_LEVEL = [0,0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,4,4,5,5,6,6,7,7,8,9,10,11,12,13,14,15,16,17,18,19,21]

  $scope.donut = [defaultDataPoint];

  $http.get('frames.json')
    .then(function(response){
      $scope.suits = response.data;
      $scope.currentSuit = $scope.suits[0];

      _.each($scope.suits, function(suit){ suit.level = 40; });
      $scope.loadPerks();
    });

  $scope.loadPerks = function() {
    $http.get('perks.json')
      .then(function(response){
        $scope.perks = response.data;
        $scope.groupedPerks = _.groupBy($scope.perks, $scope.group);

        $scope.updatePerkAvailability();
      });
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
      // var index = $scope.donut.indexOf(dataPoint);
      // if (index !== -1) { $scope.donut.splice(index, 1); }
      $scope.selected_perks_count -= 1;
    }
    else
    {
      if (perk.cost > defaultDataPoint.value) {
        return;
      }

      if ($scope.selected_perks_count >= 10) {
        return;
      }

      $scope.points += perk.cost;
      perk.selected = true;

      // $scope.donut.push();
      $scope.selected_perks_count += 1;
    }

    var selected = $filter('filter')($scope.perks,{ selected: true });
    var sorted = $filter('orderBy')(selected,'cost');
    $scope.donut = _.map(sorted, function(perk){
      return {
        id: perk.id,
        color: COLOR_MAP[perk.type],
        value: perk.cost
      };
    });

    $scope.donut.push(defaultDataPoint);
  };

  $scope.updatePerkAvailability = function() {
    _.each($scope.perks, function(perk){
      var frame = _.findWhere($scope.suits, { name: perk.frame });
      if (perk.restrictions && perk.restrictions.length && !_.contains(perk.restrictions, $scope.currentSuit.name)) {
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

  $scope.drawPointsLabel = function() {
    var canvas = $('canvas').get(0);
    var ctx = canvas.getContext('2d');
    var x = canvas.width / 2;
    var y = canvas.height / 2 + 50;

    ctx.textAlign = 'center';
    ctx.font = "1.5em Noto Sans";
    ctx.fillStyle = "white";
    ctx.fillText($scope.points + '/' + $scope.max_points + ' POINTS', x,y);
    ctx.fillText('ALLOCATED',x,y+30);
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

      var options = {
      };

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

app.directive('perk', function($popover) {
  return {
    templateUrl: 'perk.html',
    restrict: 'E',
    scope: {
      data: '=data'
    },
    link: function(scope, element, attrs){
      var popover = $popover(element,{
        trigger: 'hover',
        template: 'popover.html'
      });
      popover.$scope.perk = scope.data;
    }
  };
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
