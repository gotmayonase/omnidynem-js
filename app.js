/*global Chart */
var app = angular.module('Perks', ['ui.utils','ui.router','mgcrea.ngStrap','ngAnimate','mgcrea.ngStrap.helpers.dimensions','mgcrea.ngStrap.modal', 'ngSanitize']);

app.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('perks', {
      url: '/perks',
      templateUrl: 'perks.html',
      controller: 'PerksController'
    });

  /* Add New States Above */
  $urlRouterProvider.otherwise('/perks');
});


app.controller('PerksController', function($scope, $http, $filter, $location){

  $scope.saveBuild = function(){
    var perks = _.filter($scope.perks, function(perk){ return perk.selected; });
    var output = {
      suit: $scope.currentSuit.id,
      perks: _.map(perks, function(perk){ return perk.id; })
    };

    $scope.shareUrl="http://localhost:9001/#/perks?build=" + btoa(JSON.stringify(output));
  };

  $scope.perksHash = null;
  $scope.points = 0;
  $scope.max_points = 21;
  $scope.suits  = [];
  $scope.perks  = [];
  $scope.allPerks = [];
  $scope.group  = "cost";
  $scope.selected_perks_count = 0;
  $scope.currentSuit = null;
  $scope.requirements = [];
  $scope.costs_map = {
    '1': 'Basic',
    '2': 'Intermediate',
    '5': 'Advanced',
    '8': 'Master'
  };
  $scope.loaded=false;

  $scope.tags = [
    { name: 'All',      image: null, click: 'filterPerks(null)', key: 'all',      thumb: null },
    { name: 'Damage',   image: null, click: 'filterPerks(item)', key: 'damage',   thumb: 'damage.png' },
    { name: 'Defense',  image: null, click: 'filterPerks(item)', key: 'defense',  thumb: 'defense.png' },
    { name: 'Healing',  image: null, click: 'filterPerks(item)', key: 'healing',  thumb: 'healing.png' },
    { name: 'Movement', image: null, click: 'filterPerks(item)', key: 'movement', thumb: 'movement.png' },
    { name: 'Utility',  image: null, click: 'filterPerks(item)', key: 'utility',  thumb: 'utility.png' }
  ];
  $scope.currentTag = null;

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

  var POINTS_PER_LEVEL = [0,0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,4,4,5,5,6,6,7,7,8,9,10,11,12,13,14,15,16,17,18,19,21];

  $scope.donut = [defaultDataPoint];

  $http.get('data/frames.json')
    .then(function(response){
      $scope.suits = response.data;
      $scope.currentSuit = $scope.suits[0];
      $scope.groupedSuits = _.groupBy($scope.suits, 'type');
      _.each($scope.suits, function(suit){ suit.level = 40; });
      $scope.loadPerks();
      $scope.loaded = true;
      $scope.drawPointsLabel();
    });

  $scope.loadPerks = function() {
    $http.get('data/perks.json')
      .then(function(response){
        $scope.perks = response.data;
        $scope.allPerks = $scope.perks;
        $scope.groupedPerks = _.groupBy($scope.perks, $scope.group);

        // Update builds
        if ($location.search() && $location.search().build){
          var decodedString = atob($location.search().build);
          var obj = JSON.parse(decodedString);

          // get suit
          var frame = _.findWhere($scope.suits, { id: obj.suit });
          $scope.currentSuit = frame;

          $scope.updatePerkAvailability();

          var perks = _.filter($scope.perks, function(perk){
            return _.contains(obj.perks, perk.id);
          });

          _.each(perks, function(perk){
            $scope.togglePerk(perk);
          });
        }
        else
        {
          $scope.updatePerkAvailability();
        }
      });
  };

  $scope.setFrame = function(frame) {
    $scope.currentSuit = frame;
    $scope.updatePerkAvailability();
  };

  $scope.filterPerks = function(tag) {
    $scope.currentTag = tag;
    if (tag == null) {
      $scope.perks = $scope.allPerks;
    } else {
      $scope.perks = _.filter($scope.allPerks, function(perk){
        return _.contains(perk.tags, tag.key);
      });
    }

    $scope.groupedPerks = _.groupBy($scope.perks, $scope.group);
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

      $scope.selected_perks_count += 1;
    }

    var selected = $filter('filter')($scope.allPerks,{ selected: true });
    var sorted = $filter('orderBy')(selected,'cost');
    $scope.donut = _.map(sorted, function(perk){
      return {
        id: perk.id,
        color: COLOR_MAP[perk.type],
        value: perk.cost
      };
    });

    $scope.donut.push(defaultDataPoint);
    $scope.updatePerkRequirements(selected);
    $scope.updatePerksHash(selected);
  };


  $scope.updatePerksHash = function(selectedPerks) {
    var output = {
      suit: $scope.currentSuit.id,
      perks: _.map(selectedPerks, function(perk){ return perk.id; })
    };

    $scope.perksHash = btoa(JSON.stringify(output));
    var path = $location.path() + '?build=' + $scope.perksHash;
    $location.url(path).replace();
  };

  $scope.updatePerkRequirements = function(selectedPerks) {
    $scope.requirements = [];
    _.each(selectedPerks, function(perk){
      if (perk.frame) {
        requireFrame(perk.frame, perk.level);
      }
    });
    requireFrame($scope.currentSuit.name, 40);
  };

  function requireFrame(frame, level) {
    var _frame = _.findWhere($scope.suits, { name: frame });
    var existing_req = _.findWhere($scope.requirements, { frame: _frame });
    if (existing_req) {
      existing_req.level = Math.max(existing_req.level, level);
    } else {
      $scope.requirements.push({
        frame: _frame,
        level: level
      });
    }
  }

  $scope.updatePerkAvailability = function() {
    _.each($scope.allPerks, function(perk){
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
    var selected = $filter('filter')($scope.allPerks,{ selected: true });
    $scope.updatePerkRequirements(selected);
  };

  $scope.drawPointsLabel = function() {
    if ($scope.loaded) {
      var canvas = $('canvas').get(0);
      var ctx = canvas.getContext('2d');
      var x = canvas.offsetWidth / 2;
      var y = canvas.offsetHeight / 2 + 20;

      ctx.textAlign = 'center';
      ctx.font = "1.0em Eurostile Demi";
      ctx.fillStyle = "white";
      ctx.fillText($scope.points + '/' + $scope.max_points + ' POINTS', x, y);
      ctx.fillText('ALLOCATED',x,y+20);
    }
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
        template: 'popover.html',
        placement: 'bottom-left'
      });
      popover.$scope.perk = scope.data;
    }
  };
});

app.directive('requirement', function($popover) {
  return {
    templateUrl: 'requirement.html',
    restrict: 'E',
    scope: {
      data: '=data'
    },
    link: function(scope, element, attrs){
      var popover = $popover(element,{
        trigger: 'hover',
        template: 'frame_popover.html',
        placement: 'bottom-left'
      });
      popover.$scope.requirement = scope.data;
    }
  };
});

app.directive('share', function($location) {
  return {
    templateUrl: 'share.html',
    restrict: 'E',
    scope: {
      perksHash: '@'
    },
    link: function(scope, element, attrs){

      scope.select = function(event){
        $(event.target).select();
      };

      scope.modal = {
        url: $location.absUrl()
      };
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
