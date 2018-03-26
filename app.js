var app = angular.module('app', []);

app.factory('Floor', FloorModel);

function FloorModel() {

	function Floor(index) {
		this.index = index;
		this.pos = (index * (100 + 5) + 15);
		this.up = false;
		this.down = false;
		this.active = false;
	}

	return Floor;
}



app.controller('MainCtrl', MainCtrl);

MainCtrl.$inject = [
	'$scope',
	'$timeout',
	'Floor',
	'$anchorScroll',
	'$location'
];

function MainCtrl($scope, $timeout, Floor, $anchorScroll, $location) {

	var _animationStep = 5;
	var _animationTime = 100;
	var _liftOpenTime = 2000;

    var self = this, _timer;

	var _upRequests;
	var _downRequests;

	var _nextUpRequests;
	var _nextDownRequests;

	var _currentFloor;

	self.requestFloor = requestFloor;
	self.increaseFloor = increaseFloor;
	self.decreaseFloor = decreaseFloor;

	function init(floor) {

		if (_timer) {
			$timeout.cancel(_timer);
			_timer = null;
		}

		_upRequests = [];
		_downRequests = [];

		_nextUpRequests = [];
		_nextDownRequests = [];

		_currentFloor = 0;

		self.isLiftOpen = false;

		self.liftDir = 0;       // 0 for up and 1 for down
		self.liftPos = 15;

		self.floorLength = floor;
		self.floors = [];
		for(var i = floor; i >= 0; i--)
			self.floors.push(new Floor(i));

		$anchorScroll.yOffset = 70;
		scrollToLift();
	}

	// Direction: 0 for up and 1 for down
	function requestFloor(floor, direction) {

		if (direction === 0)
			floor.up = true;

		if (direction === 1)
			floor.down = true;

		floor.active = true;
		if ((direction === 0) || (!direction && self.liftPos < floor.pos)) {
			pushToRequest(floor, (self.liftDir === 1 ||self.liftPos < floor.pos) ? _upRequests : _nextUpRequests, true);
		} else if ((direction === 1) || (!direction && self.liftPos > floor.pos)) {
			pushToRequest(floor, (self.liftDir === 0 || self.liftPos > floor.pos) ? _downRequests : _nextDownRequests);
		}

		if (_timer) {
			$timeout.cancel(_timer);
			_timer = null;
		}

		runLift();
	}

	function runLift() {

		(function loop() {

			self.isLiftOpen = false;
			if (_upRequests.length !== 0 || _downRequests.length !== 0 ||
				_nextUpRequests.length !== 0 || _nextDownRequests.length !== 0) {

				if (self.liftDir === 0)
					processUpRequest();
				else if (self.liftDir === 1)
					processDownRequest();

				scrollToLift();
				if (!$scope.$$phase)
					$scope.$apply();

				var additionalTime = (self.isLiftOpen == true) ? _liftOpenTime : 0;
				_timer = $timeout(loop, _animationTime + additionalTime);

			} else {
				$timeout.cancel(_timer);
				_timer = null;
			}

			activeAllPendingRequests();

		})();

	}

	function processUpRequest() {
		var floor;
		if (_upRequests.length === 0) {

			if (_downRequests.length > 0 && _downRequests[0].pos > self.liftPos) {
				floor = _downRequests[0];
				self.liftPos += _animationStep;
			} else {
				self.liftDir = 1;
				Array.prototype.push.apply(_upRequests, _nextUpRequests);
				_nextUpRequests.length = 0;
			}

			return;
		}

		var floor = _upRequests[0];
		self.liftPos += _animationStep;
		if (self.liftPos >= floor.pos) {
			self.liftPos = floor.pos;
			floor.up = false;
			_currentFloor = floor;
			self.isLiftOpen = true;
			floor.active = false;
			popFromRequest(_upRequests);
			//activeAllPendingRequests();
		}
	}

	function processDownRequest() {

		var floor;

		if (_downRequests.length === 0) {

			if (_upRequests.length > 0 && _upRequests[0].pos < self.liftPos) {
				floor = _upRequests[0];
				self.liftPos -= _animationStep;
			} else {
				self.liftDir = 0;
				Array.prototype.push.apply(_downRequests, _nextDownRequests);
				_nextDownRequests.length = 0;
			}

			return;
		}

		floor = _downRequests[0];
		self.liftPos -= _animationStep;
		if (self.liftPos <= floor.pos) {
			self.liftPos = floor.pos;
			floor.down = false;
			_currentFloor = floor;
			self.isLiftOpen = true;
			floor.active = false;
			popFromRequest(_downRequests);
			//activeAllPendingRequests();
		}
	}

	function pushToRequest(floor, requests, isUp) {

		console.log(requests.map(function(i) { return i.index; }).join(' '));
		var requestSize = requests.length, i = 0;

		while (i < requestSize) {

			if (isUp) {
				if (floor.pos < requests[i].pos)
					break;
				else if (floor.pos === requests[i].pos)
					return;
			}


			if (!isUp) {
				if (floor.pos > requests[i].pos)
					break;
				else if (floor.pos === requests[i].pos)
					return;
			}

			++i;
		}

		requests.splice(i, 0, floor);
	}

	function popFromRequest(requests) {
		requests.splice(0, 1);
	}

	function scrollToLift() {
		$location.hash('lift');
		$anchorScroll();
	}

	function increaseFloor() {
		if(self.floorLength > 0)
			++self.floorLength;
		else
			self.floorLength = 1;

		init(self.floorLength);
	}


	function decreaseFloor() {
		if(self.floorLength > 0)
			--self.floorLength;

		init(self.floorLength);
	}

	function activeAllPendingRequests() {
		var i;
		for (i = 0; i < _upRequests.length; ++i)
			_upRequests[i].active = true;
		for (i = 0; i < _nextUpRequests.length; ++i)
			_nextUpRequests[i].active = true;
		for (i = 0; i < _downRequests.length; ++i)
			_downRequests[i].active = true;
		for (i = 0; i < _nextDownRequests.length; ++i)
			_nextDownRequests[i].active = true;
	}

	init(5);
}

