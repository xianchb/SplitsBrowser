/*
 *  SplitsBrowser - Competitor tests.
 *  
 *  Copyright (C) 2000-2020 Dave Ryder, Reinhard Balling, Andris Strazdins,
 *                          Ed Nash, Luke Woodward
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */
(function (){
    "use strict";

    var isNaNStrict = SplitsBrowser.isNaNStrict;
    var compareCompetitors = SplitsBrowser.Model.compareCompetitors;
    var fromCumTimes = SplitsBrowser.Model.Competitor.fromCumTimes;
    var fromOriginalCumTimes = SplitsBrowser.Model.Competitor.fromOriginalCumTimes;

    function signum(n) {
        return (n < 0) ? -1 : ((n > 0) ? 1 : 0);
    }

    QUnit.module("Competitor");
    
    var assertSplitTimes = function (assert, competitor, expectedSplitTimes) {
        expectedSplitTimes.forEach(function (splitTime, controlIdx) {
            assert.strictEqual(competitor.getSplitTimeTo(controlIdx + 1), splitTime);
        });
    };
    
    var assertOriginalSplitTimes = function (assert, competitor, expectedSplitTimes) {
        expectedSplitTimes.forEach(function (splitTime, controlIdx) {
            assert.strictEqual(competitor.getOriginalSplitTimeTo(controlIdx + 1), splitTime);
        });
    };
    
    var assertCumulativeTimes = function (assert, competitor, expectedCumulativeTimes) {
        expectedCumulativeTimes.forEach(function (splitTime, controlIdx) {
            assert.strictEqual(competitor.getCumulativeTimeTo(controlIdx), splitTime);
        });
    };
    
    var assertOriginalCumulativeTimes = function (assert, competitor, expectedCumulativeTimes) {
        expectedCumulativeTimes.forEach(function (splitTime, controlIdx) {
            assert.strictEqual(competitor.getOriginalCumulativeTimeTo(controlIdx), splitTime);
        });
    };

    QUnit.test("Cannot create a competitor from cumulative times when the cumulative times argument isn't an array", function (assert) {
        SplitsBrowserTest.assertException(assert, "TypeError", function () {
            fromCumTimes(1, "First Runner", "ABC", 10 * 3600, "This is not an array");
        });
    });

    QUnit.test("Cannot create a competitor from an empty array of cumulative times", function (assert) {
        SplitsBrowserTest.assertInvalidData(assert, function () {
            fromCumTimes(1, "First Runner", "ABC", 10 * 3600, []);
        });
    });

    QUnit.test("Cannot create a competitor from an array of cumulative times that does not start with zero", function (assert) {
        SplitsBrowserTest.assertInvalidData(assert, function () {
            fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [40, 60, 90]);
        });
    });

    QUnit.test("Cannot create a competitor from an array of cumulative times containing only a single zero", function (assert) {
        SplitsBrowserTest.assertInvalidData(assert, function () {
            fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0]);
        });
    });

    QUnit.test("Can create a competitor from cumulative times and determine split times", function (assert) {
        var cumTimes = [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100];
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, cumTimes);
        assertCumulativeTimes(assert, competitor, cumTimes);
        assert.deepEqual(competitor.getAllCumulativeTimes(), cumTimes);
        assertSplitTimes(assert, competitor, [65, 221, 184, 100]);
        assert.ok(competitor.completed(), "Competitor should be marked as completing the course");
        assert.ok(!competitor.isOKDespiteMissingTimes, "Competitor should not be marked as OK despite having missing times");
        assert.ok(!competitor.isNonCompetitive, "Competitor should not be marked as non-competitive");
        assert.ok(!competitor.isNonStarter, "Competitor should not be a non-starter");
        assert.ok(!competitor.isNonFinisher, "Competitor should not be a non-finisher");
        assert.ok(!competitor.isDisqualified, "Competitor should not be disqualified");
        assert.ok(!competitor.isOverMaxTime, "Competitor should not be over max time");
    });

    QUnit.test("Can create a competitor from cumulative times and determine split times when competitor has missed a control", function (assert) {
        var cumTimes = [0, 65, null, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100];
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, cumTimes);
        assertCumulativeTimes(assert, competitor, cumTimes);
        assert.deepEqual(competitor.getAllCumulativeTimes(), cumTimes);
        assertSplitTimes(assert, competitor, [65, null, null, 184, 100]);
        assert.ok(!competitor.completed(), "Competitor should be marked as not completing the course");
    });

    QUnit.test("Can create a competitor from cumulative times and determine split times when competitor has missed multiple consecutive controls", function (assert) {
        var cumTimes = [0, 65, null, null, null, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100];
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, cumTimes);
        assertCumulativeTimes(assert, competitor, cumTimes);
        assertSplitTimes(assert, competitor, [65, null, null, null, null, 184, 100]);
        assert.ok(!competitor.completed(), "Competitor should be marked as not completing the course");
    });

    QUnit.test("Can create a non-competitive competitor from cumulative times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        competitor.setNonCompetitive();
        assert.ok(competitor.completed(), "Competitor should be marked as completing the course");
        assert.ok(!competitor.isOKDespiteMissingTimes, "Competitor should not be marked as OK despite having missing times");
        assert.ok(competitor.isNonCompetitive, "Competitor should not be competitive");
        assert.ok(!competitor.isNonStarter, "Competitor should not be a non-starter");
        assert.ok(!competitor.isNonFinisher, "Competitor should not be a non-finisher");
        assert.ok(!competitor.isDisqualified, "Competitor should not be disqualified");
        assert.ok(!competitor.isOverMaxTime, "Competitor should not be over max time");
    });

    QUnit.test("Can create a non-starting competitor from cumulative times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null, null, null, null]);
        competitor.setNonStarter();
        assert.ok(!competitor.completed(), "Competitor should not be marked as completing the course");
        assert.ok(!competitor.isOKDespiteMissingTimes, "Competitor should not be marked as OK despite having missing times");
        assert.ok(!competitor.isNonCompetitive, "Competitor should not be marked as non-competitive");
        assert.ok(competitor.isNonStarter, "Competitor should be a non-starter");
        assert.ok(!competitor.isNonFinisher, "Competitor should not be a non-finisher");
        assert.ok(!competitor.isDisqualified, "Competitor should not be disqualified");                
        assert.ok(!competitor.isOverMaxTime, "Competitor should not be over max time");
    });

    QUnit.test("Can create a non-finishing competitor from cumulative times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, null, null]);
        competitor.setNonFinisher();
        assert.ok(!competitor.completed(), "Competitor should be marked as completing the course");
        assert.ok(!competitor.isOKDespiteMissingTimes, "Competitor should not be marked as OK despite having missing times");
        assert.ok(!competitor.isNonCompetitive, "Competitor should not be marked as non-competitive");
        assert.ok(!competitor.isNonStarter, "Competitor should not be a non-starter");
        assert.ok(competitor.isNonFinisher, "Competitor should be a non-finisher");
        assert.ok(!competitor.isDisqualified, "Competitor should not be disqualified");        
        assert.ok(!competitor.isOverMaxTime, "Competitor should not be over max time");
    });

    QUnit.test("Can obtain null cumulative and split times for non-starting competitor beyond the end of their controls", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null]);
        competitor.setNonStarter();
        assert.strictEqual(null, competitor.getOriginalCumulativeTimeTo(6));
        assert.strictEqual(null, competitor.getOriginalSplitTimeTo(6));
    });

    QUnit.test("Can create a disqualified competitor from cumulative times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        competitor.disqualify();
        assert.ok(!competitor.completed(), "Disqualified competitor should not be marked as completing the course");
        assert.ok(!competitor.isOKDespiteMissingTimes, "Competitor should not be marked as OK despite having missing times");
        assert.ok(!competitor.isNonCompetitive, "Competitor should not be marked as non-competitive");
        assert.ok(!competitor.isNonStarter, "Competitor should not be a non-starter");
        assert.ok(!competitor.isNonFinisher, "Competitor should not be a non-finisher");
        assert.ok(competitor.isDisqualified, "Competitor should be disqualified");
        assert.ok(!competitor.isOverMaxTime, "Competitor should not be over max time");
    });

    QUnit.test("Can create an over-max-time competitor from cumulative times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        competitor.setOverMaxTime();
        assert.ok(!competitor.completed(), "Over-max-time competitor should not be marked as completing the course");
        assert.ok(!competitor.isOKDespiteMissingTimes, "Competitor should not be marked as OK despite having missing times");
        assert.ok(!competitor.isNonCompetitive, "Competitor should not be marked as non-competitive");
        assert.ok(!competitor.isNonStarter, "Competitor should not be a non-starter");
        assert.ok(!competitor.isNonFinisher, "Competitor should not be a non-finisher");
        assert.ok(!competitor.isDisqualified, "Competitor should not be disqualified");
        assert.ok(competitor.isOverMaxTime, "Competitor should be over max time");
    });

    QUnit.test("Can create a competitor marked as OK despite missing times from cumulative times", function (assert) {
        var cumTimes = [0, 65, 65 + 221, null, 65 + 221 + 184 + 100];
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, cumTimes);
        competitor.setOKDespiteMissingTimes();
        assert.ok(competitor.completed(), "OK-despite-missing-times competitor should be marked as completing the course");
        assert.ok(competitor.isOKDespiteMissingTimes, "Competitor should be marked as OK despite having missing times");
        assert.ok(!competitor.isNonCompetitive, "Competitor should not be marked as non-competitive");
        assert.ok(!competitor.isNonStarter, "Competitor should not be a non-starter");
        assert.ok(!competitor.isNonFinisher, "Competitor should not be a non-finisher");
        assert.ok(!competitor.isDisqualified, "Competitor should not be disqualified");
        assert.ok(!competitor.isOverMaxTime, "Competitor should be over max time");
        assert.strictEqual(65 + 221 + 184 + 100, competitor.totalTime, "OK-despite-missing-times competitor should have a total time");
    });

    QUnit.test("Can create a competitor with gender and year of birth and read them back", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        competitor.setYearOfBirth(1984);
        competitor.setGender("M");
        assert.strictEqual(competitor.yearOfBirth, 1984);
        assert.strictEqual(competitor.gender, "M");
    });

    QUnit.test("Can create a competitor from original cumulative times and determine original split times with final times still null", function (assert) {
        var cumTimes = [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100];
        var competitor = fromOriginalCumTimes(1, "First Runner", "ABC", 10 * 3600, cumTimes);
        assertOriginalCumulativeTimes(assert, competitor, cumTimes);
        assertOriginalSplitTimes(assert, competitor, [65, 221, 184, 100]);
        assert.strictEqual(competitor.cumTimes, null);
        assert.strictEqual(competitor.splitTimes, null);
        assert.deepEqual(competitor.getAllOriginalCumulativeTimes(), cumTimes);
    });

    QUnit.test("Can create a competitor from original cumulative times and set repaired times with NaNs replacing dubious splits", function (assert) {
        var cumTimes = [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100];
        var competitor = fromOriginalCumTimes(1, "First Runner", "ABC", 10 * 3600, cumTimes);
        
        competitor.setRepairedCumulativeTimes([0, 65, 65 + 221, NaN, 65 + 221 + 184 + 100]);
        
        assert.strictEqual(competitor.getCumulativeTimeTo(0), 0);
        assert.strictEqual(competitor.getCumulativeTimeTo(1), 65);
        assert.strictEqual(competitor.getCumulativeTimeTo(2), 65 + 221);
        assert.ok(isNaN(competitor.getCumulativeTimeTo(3)));
        assert.strictEqual(competitor.getCumulativeTimeTo(4), 65 + 221 + 184 + 100);
        
        assert.strictEqual(competitor.getSplitTimeTo(0), 0);
        assert.strictEqual(competitor.getSplitTimeTo(1), 65);
        assert.strictEqual(competitor.getSplitTimeTo(2), 221);
        assert.ok(isNaN(competitor.getSplitTimeTo(3)));
        assert.ok(isNaN(competitor.getSplitTimeTo(4)));
    });

    QUnit.test("Competitor created from ascending cumulative times has no dubious cumulative nor split times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        for (var control = 0; control < 5; control += 1) {
            assert.ok(!competitor.isCumulativeTimeDubious(control));
            assert.ok(!competitor.isSplitTimeDubious(control));
        }
    });

    QUnit.test("Competitor created with dubious cumulative time has one dubious cumulative time and two dubious split times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 0, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        competitor.setRepairedCumulativeTimes([0, 65, NaN, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        for (var control = 0; control < 5; control += 1) {
            assert.strictEqual(competitor.isCumulativeTimeDubious(control), (control === 2));
            assert.strictEqual(competitor.isSplitTimeDubious(control), (control === 2 || control === 3));
        }
    });
    
    QUnit.test("Competitor with start time but all-null splits is not lacking a start time", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null, null, null, null]);
        assert.ok(!competitor.lacksStartTime());
    });
        
    QUnit.test("Competitor with start time and splits is not lacking a start time", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        assert.ok(!competitor.lacksStartTime());
    });
        
    QUnit.test("Competitor with no start time nor any splits is not lacking a start time", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", null, [0, null, null, null, null]);
        assert.ok(!competitor.lacksStartTime());
    });
        
    QUnit.test("Competitor with no start time but all splits is lacking a start time", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", null, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        assert.ok(competitor.lacksStartTime());
    });
        
    QUnit.test("Competitor with no start time but some splits is lacking a start time", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", null, [0, 65, null, null, 65 + 221 + 184 + 100]);
        assert.ok(competitor.lacksStartTime());
    });

    QUnit.test("Can determine total time of a competitor that punches all controls", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        assert.strictEqual(competitor.totalTime, 65 + 221 + 184 + 100, "Wrong total time");
    });

    QUnit.test("Determines total time of a competitor that mispunches as null", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, null, 65 + 221 + 184 + 100]);
        assert.strictEqual(competitor.totalTime, null, "Total time should be null");
    });
    
    QUnit.test("Competitor with valid time compares equal to itself", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 154]);
        assert.strictEqual(compareCompetitors(competitor, competitor), 0);
    });

    QUnit.test("Competitor with lower total time comes before competitor with higher total time", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 154]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 188]);
        assert.strictEqual(signum(compareCompetitors(competitor1, competitor2)), -1);
    });

    QUnit.test("Competitor with higher total time comes before competitor with higher total time", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 188]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 154]);
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), 1);
    });

    QUnit.test("Competitor with lower order comes before competitor with same total time but higher order", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 188]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 188]);
        assert.ok(signum(compareCompetitors(competitor1, competitor2)) , -1);
    });

    QUnit.test("Competitor with higher order comes after competitor with same total time but lower order", function (assert) {
        var competitor1 = fromCumTimes(3, "First Runner", "ABC", 10 * 3600, [0, 188]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 188]);
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), 1);
    });

    QUnit.test("Mispunching competitor compares equal to itself", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null]);
        assert.strictEqual(compareCompetitors(competitor, competitor), 0);
    });
    
    QUnit.test("Competitor with valid time comes before mispunching competitor", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 154]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, null]);
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), -1);
    });

    QUnit.test("Mispunching competitor comes after competitor with valid time", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 188]);
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), 1);
    });

    QUnit.test("Mispunching competitor with lower order comes before mispunching competitor with higher order", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0,null]);
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), -1);
    });

    QUnit.test("Mispunching competitor with higher order comes before mispunching competitor with lower order", function (assert) {
        var competitor1 = fromCumTimes(3, "First Runner", "ABC", 10 * 3600, [0, null]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, null]);
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), 1);
    });

    QUnit.test("Disqualified competitor compares equal to itself", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 154]);
        competitor.disqualify();
        assert.strictEqual(compareCompetitors(competitor, competitor), 0);
    });

    QUnit.test("Valid competitor comes before disqualified competitor", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 154]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 188]);
        competitor2.disqualify();
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), -1);
    });

    QUnit.test("Disqualified competitor comes after valid competitor", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 154]);
        competitor1.disqualify();
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 188]);
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), 1);
    });

    QUnit.test("Disqualified competitor with lower order comes before disqualified competitor with higher order", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 154]);
        competitor1.disqualify();
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 188]);
        competitor2.disqualify();
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), -1);
    });

    QUnit.test("Disqualified competitor with higher order comes before disqualified competitor with lower order", function (assert) {
        var competitor1 = fromCumTimes(3, "First Runner", "ABC", 10 * 3600, [0, 188]);
        competitor1.disqualify();
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 154]);
        competitor2.disqualify();
        assert.ok(signum(compareCompetitors(competitor1, competitor2)), 1);
    });
    
    QUnit.test("Competitor with no times missing has times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        assert.ok(competitor.hasAnyTimes(), "Competitor with no times missing should have times");
    });
    
    QUnit.test("Competitor with some but not all times missing has times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, null, null, 65 + 221 + 184 + 100]);
        assert.ok(competitor.hasAnyTimes(), "Competitor with some but not all times missing should have times");
    });
    
    QUnit.test("Competitor with all times missing does not have times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null, null, null, null]);
        assert.ok(!competitor.hasAnyTimes(), "Competitor with all times missing should not have times");
    });

    QUnit.test("Can adjust a competitor's cumulative times by reference data with all valid times and same number of controls", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193 + 176, 61 + 193 + 176 + 103];
        var expectedCumTimes = [0, 4, 4 + 28, 4 + 28 + 8, 4 + 28 + 8 - 3];
        assert.deepEqual(competitor.getCumTimesAdjustedToReference(referenceCumTimes), expectedCumTimes);
    });

    QUnit.test("Can adjust a competitor's cumulative times with a missing time by reference data with all valid times and same number of controls", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, null, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193 + 176, 61 + 193 + 176 + 103];
        var expectedCumTimes = [0, 4, 4 + 28, null, 4 + 28 + 8 - 3];
        assert.deepEqual(competitor.getCumTimesAdjustedToReference(referenceCumTimes), expectedCumTimes);
    });

    QUnit.test("Cannot adjust a competitor's cumulative times by reference data with a different number of times", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, null, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193 + 176];
        
        SplitsBrowserTest.assertInvalidData(assert, function () {
            competitor.getCumTimesAdjustedToReference(referenceCumTimes);
        });
    });

    QUnit.test("Cannot adjust a competitor's cumulative times by reference data with a null value", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, null, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, null, 61 + 193 + 176 + 103];
        
        SplitsBrowserTest.assertInvalidData(assert, function () {
            competitor.getCumTimesAdjustedToReference(referenceCumTimes);
        });
    });

    QUnit.test("Can adjust a competitor's cumulative times by reference data and add start time with all valid times and same number of controls", function (assert) {
        var startTime = 10 * 3600 + 41 * 60;
        var competitor = fromCumTimes(1, "First Runner", "ABC", startTime, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193 + 176, 61 + 193 + 176 + 103];
        var expectedCumTimes = [startTime, startTime + 4, startTime + 4 + 28, startTime + 4 + 28 + 8, startTime + 4 + 28 + 8 - 3];
        assert.deepEqual(competitor.getCumTimesAdjustedToReferenceWithStartAdded(referenceCumTimes), expectedCumTimes);
    });

    QUnit.test("Can adjust a competitor's cumulative times with a missing time by reference data and add start time with all valid times and same number of controls", function (assert) {
        var startTime = 10 * 3600 + 41 * 60;
        var competitor = fromCumTimes(1, "First Runner", "ABC", startTime, [0, 65, 65 + 221, null, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193 + 176, 61 + 193 + 176 + 103];
        var expectedCumTimes = [startTime, startTime + 4, startTime + 4 + 28, null, startTime + 4 + 28 + 8 - 3];
        assert.deepEqual(competitor.getCumTimesAdjustedToReferenceWithStartAdded(referenceCumTimes), expectedCumTimes);
    });

    QUnit.test("Cannot adjust a competitor's cumulative times by reference data and add start time with a different number of times", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600 + 41 * 60, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193 + 176];
        
        SplitsBrowserTest.assertInvalidData(assert, function () {
            competitor.getCumTimesAdjustedToReferenceWithStartAdded(referenceCumTimes);
        });
    });

    QUnit.test("Cannot adjust a competitor's cumulative times by reference data and add start time if reference data contains a null value", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600 + 41 * 60, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, null, 61 + 193 + 176 + 103];
        
        SplitsBrowserTest.assertInvalidData(assert, function () {
            competitor.getCumTimesAdjustedToReferenceWithStartAdded(referenceCumTimes);
        });
    });

    QUnit.test("Can determine the percentages a competitor is behind reference data with all valid times and same number of controls", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193 + 176, 61 + 193 + 176 + 103];
        var expectedPercentagesBehind = [0, 100 * (65 - 61) / 61, 100 * (221 - 193) / 193, 100 * (184 - 176) / 176, 100 * (100 - 103) / 103];
        assert.deepEqual(competitor.getSplitPercentsBehindReferenceCumTimes(referenceCumTimes), expectedPercentagesBehind);
    });

    QUnit.test("Can determine the percentages a competitor with a missing time is behind reference data with all valid times and same number of controls", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, null, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193 + 176, 61 + 193 + 176 + 103];
        var expectedPercentagesBehind = [0, 100 * (65 - 61) / 61, 100 * (221 - 193) / 193, null, null];
        assert.deepEqual(competitor.getSplitPercentsBehindReferenceCumTimes(referenceCumTimes), expectedPercentagesBehind);
    });

    QUnit.test("Cannot determine the percentages a competitor is behind reference data with a different number of times", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193 + 176];
        
        SplitsBrowserTest.assertInvalidData(assert, function () {
            competitor.getSplitPercentsBehindReferenceCumTimes(referenceCumTimes);
        });
    });

    QUnit.test("Cannot determine the percentages a competitor is behind reference data with a null value", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, null, 61 + 193 + 176 + 103];
        
        SplitsBrowserTest.assertInvalidData(assert, function () {
            competitor.getSplitPercentsBehindReferenceCumTimes(referenceCumTimes);
        });
    });

    QUnit.test("Can determine the percentages a competitor is behind reference data, with a null percentage for a zero split", function (assert) {

        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 65 + 221, 65 + 221 + 184, 65 + 221 + 184 + 100]);
        var referenceCumTimes = [0, 61, 61 + 193, 61 + 193, 61 + 193 + 176 + 103];
        var expectedPercentagesBehind = [0, 100 * (65 - 61) / 61, 100 * (221 - 193) / 193, null, 100 * (100 - 176 - 103) / (103 + 176)];
        assert.deepEqual(competitor.getSplitPercentsBehindReferenceCumTimes(referenceCumTimes), expectedPercentagesBehind);
    });
    
    QUnit.test("Can determine time losses of competitor with even number of splits", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, 96 + 221 + 184, 96 + 221 + 184 + 100]);
        var fastestSplits = [65, 209, 184, 97];
        competitor.determineTimeLosses(fastestSplits);
        assert.strictEqual(competitor.getTimeLossAt(0), null);
        
        // Split ratios are 1.4769, 1.05742, 1, 1.03093
        // median is 1.04417
        // expected times are therefore 67.8711, 218.232, 192.1277, 101.2847
        // time losses are then  28.1288, 2.7680, -8.1277, -1.2847
        
        assert.strictEqual(competitor.getTimeLossAt(1), 28);
        assert.strictEqual(competitor.getTimeLossAt(2), 3);
        assert.strictEqual(competitor.getTimeLossAt(3), -8);
        assert.strictEqual(competitor.getTimeLossAt(4), -1);
    });
    
    QUnit.test("Can determine time losses of competitor with odd number of splits", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, 96 + 221 + 100]);
        var fastestSplits = [65, 209, 97];
        competitor.determineTimeLosses(fastestSplits);
        assert.strictEqual(competitor.getTimeLossAt(0), null);
        
        // Split ratios are 1.4769, 1.05742, 1.03093
        // median is 1.05742
        // expected times are therefore 68.7321, 211, 192.1277, 102.5694
        // time losses are then 27.2679, 0, -2.5694
        
        assert.strictEqual(competitor.getTimeLossAt(1), 27);
        assert.strictEqual(competitor.getTimeLossAt(2), 0);
        assert.strictEqual(competitor.getTimeLossAt(3), -3);
    });
    
    QUnit.test("Cannot determine time losses of competitor when given wrong number of reference splits", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, 96 + 221 + 184, 96 + 221 + 184 + 100]);
        SplitsBrowserTest.assertInvalidData(assert, function () {
            competitor.determineTimeLosses([65, 209, 97]);
        });
    });
    
    QUnit.test("Cannot determine time losses of competitor when given split times with NaN value", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, 96 + 221 + 184, 96 + 221 + 184 + 100]);
        SplitsBrowserTest.assertInvalidData(assert, function () {
            competitor.determineTimeLosses([65, 209, NaN, 97]);
        });
    });
    
    QUnit.test("Can determine time losses as all NaN if competitor has NaN repaired split", function (assert) {
        var competitor = fromOriginalCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, 96 + 221 + 184, 96 + 221 + 184 + 100]);
        competitor.setRepairedCumulativeTimes([0, 96, 96 + 221, NaN, 96 + 221 + 184 + 100]);
        var fastestSplits = [65, 209, 184, 97];
        competitor.determineTimeLosses(fastestSplits);
        
        for (var control = 1; control < 5; control += 1) {
            var timeLoss = competitor.getTimeLossAt(control);
            assert.ok(isNaNStrict(timeLoss), "Time loss at control " + control + " should be NaN, but got " + timeLoss);
        }
    });
    
    QUnit.test("Can determine time losses as all NaN if fastest splits include zero", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, 96 + 221 + 184, 96 + 221 + 184 + 100]);
        var fastestSplits = [65, 209, 0, 97];
        competitor.determineTimeLosses(fastestSplits);
        
        for (var control = 1; control < 5; control += 1) {
            var timeLoss = competitor.getTimeLossAt(control);
            assert.ok(isNaNStrict(timeLoss), "Time loss at control " + control + " should be NaN, but got " + timeLoss);
        }
    });
    
    QUnit.test("Can determine time losses as all NaN if competitor is marked as OK despite having missing controls", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, null, 96 + 221 + 184 + 100]);
        competitor.setOKDespiteMissingTimes();
        var fastestSplits = [65, 209, 184, 97];
        competitor.determineTimeLosses(fastestSplits);
        
        for (var control = 1; control < 5; control += 1) {
            var timeLoss = competitor.getTimeLossAt(control);
            assert.ok(isNaNStrict(timeLoss), "Time loss at control " + control + " should be NaN, but got " + timeLoss);
        }
    });
    
    QUnit.test("Can determine as all-NaN time losses of competitor when given fastest-split times with null value", function (assert) {
        var competitor = fromOriginalCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, 96 + 221 + 184, 96 + 221 + 184 + 100]);
        competitor.setRepairedCumulativeTimes([0, 96, 96 + 221, NaN, 96 + 221 + 184 + 100]);
        competitor.determineTimeLosses([65, 209, null, 97]);
        
        for (var control = 1; control <= 4; control += 1) {
            var timeLoss = competitor.getTimeLossAt(control);
            assert.ok(isNaNStrict(timeLoss), "Time loss at control " + control + " should be NaN, but got " + timeLoss);
        }
    });
    
    QUnit.test("Can determine time losses as all null if competitor mispunches", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, null, 96 + 221 + 184 + 100]);
        competitor.determineTimeLosses([65, 209, 184, 97]);
        for (var controlIdx = 0; controlIdx <= 4; controlIdx += 1) {
            assert.strictEqual(competitor.getTimeLossAt(controlIdx), null);
        }
    });
    
    QUnit.test("Can determine time losses as all null if competitor mispunches even if fastest times also have null in them", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 96, 96 + 221, null, 96 + 221 + 184 + 100]);
        competitor.determineTimeLosses([65, 209, null, 97]);
        for (var controlIdx = 0; controlIdx <= 4; controlIdx += 1) {
            assert.strictEqual(competitor.getTimeLossAt(controlIdx), null);
        }
    });
    
    QUnit.test("Cannot determine that a competitor crosses another one with a different number of controls", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 421]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 12 * 3600, [0, 71, 218, 379, 440, 491]);
        
        SplitsBrowserTest.assertInvalidData(assert, function () {
            competitor1.crosses(competitor2);
        });
    });
    
    QUnit.test("Can determine that a competitor does not cross themselves", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 421]);
        assert.ok(!competitor.crosses(competitor), "Competitor should not cross themselves");
    });
    
    QUnit.test("Can determine that a competitor does not cross a competitor with identical splits starting an hour later", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 421]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 11 * 3600, [0, 65, 221, 384, 421]);
        assert.ok(!competitor1.crosses(competitor2), "Competitors should not cross");
    });
    
    QUnit.test("Can determine that a competitor does not cross a competitor with identical splits starting an hour earlier", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 421]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF",  9 * 3600, [0, 65, 221, 384, 421]);
        assert.ok(!competitor1.crosses(competitor2), "Competitors should not cross");
    });
    
    QUnit.test("Can determine that two competitors cross on the way to control 1", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 421]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 10 * 3600 - 60, [0, 265, 421, 584, 621]);
        assert.ok(competitor1.crosses(competitor2), "Competitors should cross");
    });
    
    QUnit.test("Can determine that two competitors cross between controls 2 and 3", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 421]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 10 * 3600 - 60, [0, 65, 221, 584, 621]);
        assert.ok(competitor1.crosses(competitor2), "Competitors should cross");
    });
    
    QUnit.test("Can determine that two competitors cross between controls 1 and 2 and cross back later", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 721]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 10 * 3600 - 60, [0, 65, 421, 584, 621]);
        assert.ok(competitor1.crosses(competitor2), "Competitors should cross");
    });
    
    QUnit.test("Can determine that two competitors do not cross between because the first one has a null split", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, null, 384, 521]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 10 * 3600 - 60, [0, 65, 221, 384, 521]);
        assert.ok(!competitor1.crosses(competitor2), "Competitors should not cross");
    });
    
    QUnit.test("Can determine that two competitors do not cross between because the second one has a null split", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521]);
        var competitor2 = fromCumTimes(2, "Second Runner", "DEF", 10 * 3600 - 60, [0, 65, 221, null, 521]);
        assert.ok(!competitor1.crosses(competitor2), "Competitors should not cross");
    });
    
    QUnit.test("Returns null value for cumulative rank when no ranks set", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521]);
        assert.strictEqual(competitor1.getCumulativeRankTo(2), null, "A null cumulative rank should be returned");
    });
    
    QUnit.test("Returns non-null value for cumulative rank when ranks set", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521]);
        competitor1.setSplitAndCumulativeRanks([1, 1, 1, 1], [2, 2, 2, 2]);
        assert.strictEqual(competitor1.getCumulativeRankTo(2), 2, "A non-null cumulative rank should be returned");
    });
    
    QUnit.test("Returns null value for cumulative rank at start control", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521]);
        competitor1.setSplitAndCumulativeRanks([1, 1, 1, 1], [2, 2, 2, 2]);
        assert.strictEqual(competitor1.getCumulativeRankTo(0), null, "A null cumulative rank should be returned for the start");
    });
    
    QUnit.test("Returns null value for split rank when no ranks set", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521]);
        assert.strictEqual(competitor1.getSplitRankTo(2), null, "A null split rank should be returned");
    });
    
    QUnit.test("Returns non-null value for split rank when ranks set", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521]);
        competitor1.setSplitAndCumulativeRanks([1, 1, 1, 1], [2, 2, 2, 2]);
        assert.strictEqual(competitor1.getSplitRankTo(2), 1, "A non-null split rank should be returned");
    });
    
    QUnit.test("Returns null value for split rank at start control", function (assert) {
        var competitor1 = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521]);
        competitor1.setSplitAndCumulativeRanks([1, 1, 1, 1], [2, 2, 2, 2]);
        assert.strictEqual(competitor1.getSplitRankTo(0), null, "A null split rank should be returned for the start");
    });
    
    QUnit.test("Competitor with no omitted times has no indexes around omitted cumulative times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), []);
    });
    
    QUnit.test("Competitor with single dubious cumulative time not at the end has indexes around it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, NaN, 384, 521]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 1, end: 3}]);
    });
    
    QUnit.test("Competitor with single missing cumulative time not at the end has indexes around it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, null, 384, 521]);
        competitor.setOKDespiteMissingTimes();
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 1, end: 3}]);
    });
    
    QUnit.test("Competitor with consecutive pair of dubious cumulative times not at the end has indexes around it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, NaN, NaN, 521]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 1, end: 4}]);
    });    
    
    QUnit.test("Competitor with consecutive pair of missing cumulative times not at the end has indexes around it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, null, null, 521]);
        competitor.setOKDespiteMissingTimes();
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 1, end: 4}]);
    });    
    
    QUnit.test("Competitor with consecutive pair of dubious and omitted cumulative times not at the end has indexes around it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, NaN, null, 521]);
        competitor.setOKDespiteMissingTimes();
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 1, end: 4}]);
    });    
    
    QUnit.test("Competitor with consecutive pair of omitted and dubious cumulative times not at the end has indexes around it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, null, NaN, 521]);
        competitor.setOKDespiteMissingTimes();
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 1, end: 4}]);
    });    

    QUnit.test("Competitor with two non-consecutive omitted cumulative times not at the end has separate indexes around them", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, NaN, 221, null, 521]);
        competitor.setOKDespiteMissingTimes();
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 0, end: 2}, {start: 2, end: 4}]);
    });    
    
    QUnit.test("Competitor with dubious cumulative time at at the end has no index for it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, NaN]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), []);
    });    
    
    QUnit.test("Competitor with two non-consecutive dubious cumulative times, one at the end has only an index for the one not at the end", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, NaN, 221, 384, NaN]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 0, end: 2}]);
    });    
    
    QUnit.test("Competitor with single dubious cumulative time followed by a null has no indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, NaN, null, 521]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), []);
    });
    
    QUnit.test("Competitor with single dubious cumulative time preceded by a null has no indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null, NaN, 384, 521]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), []);
    });

    QUnit.test("Competitor with single dubious cumulative time with a null time two controls before has a pair of indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null, 221, NaN, 521]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 2, end: 4}]);
    });

    QUnit.test("Competitor with single dubious cumulative time with a null time two controls after has a pair of indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, NaN, 221, null, 521]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedCumulativeTimes(), [{start: 0, end: 2}]);
    });
        
    QUnit.test("Competitor with no dubious times has no indexes around dubious split times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), []);
    });
    
    QUnit.test("Competitor with single dubious cumulative time not at the end has indexes around the two split times it makes dubious", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, NaN, 384, 521, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), [{start: 1, end: 4}]);
    });
    
    QUnit.test("Competitor with single dubious cumulative time not at the end has indexes around the two split times it makes dubious", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, null, 384, 521, 588, 655]);
        competitor.setOKDespiteMissingTimes();
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), [{start: 1, end: 4}]);
    });
    
    QUnit.test("Competitor with consecutive pair of dubious cumulative times not at the end has indexes around it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, NaN, NaN, 521, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), [{start: 1, end: 5}]);
    });    
    
    QUnit.test("Competitor with two non dubious cumulative times with one non-dubious value between them has one pair of indexes around them", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, NaN, 221, NaN, 521, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), [{start: 0, end: 5}]);
    });    
    
    QUnit.test("Competitor with two non dubious cumulative times with two non-dubious values between them has two pair of indexes, one around each pair of dubious split times", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, NaN, 221, 384, NaN, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), [{start: 0, end: 3}, {start: 3, end: 6}]);
    });    
    
    QUnit.test("Competitor with dubious final cumulative time only has no indexes around it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521, 588, NaN]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), []);
    });
    
    QUnit.test("Competitor with dubious penultimate cumulative time only has no indexes around it", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, 221, 384, 521, NaN, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), []);
    });
    
    QUnit.test("Competitor with single dubious cumulative time not at the end with null immediately before the dubious split has no indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, null, NaN, 521, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), []);
    });
    
    QUnit.test("Competitor with single dubious cumulative time not at the end with null immediately after the dubious split has no indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, NaN, null, 521, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), []);
    });
    
    QUnit.test("Competitor with single dubious cumulative time not at the end with null two controls before the dubious split has no indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, null, 384, NaN, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), []);
    });
    
    QUnit.test("Competitor with single dubious cumulative time not at the end with null two controls after the dubious split has no indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, NaN, 384, null, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), []);
    });
    
    QUnit.test("Competitor with single dubious cumulative time not at the end with null three controls after the dubious split has a pair of indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, null, 221, 384, NaN, 588, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), [{start: 3, end: 6}]);
    });
    
    QUnit.test("Competitor with single dubious cumulative time not at the end with null three controls after the dubious split has a pair of indexes", function (assert) {
        var competitor = fromCumTimes(1, "First Runner", "ABC", 10 * 3600, [0, 65, NaN, 384, 512, null, 655]);
        assert.deepEqual(competitor.getControlIndexesAroundOmittedSplitTimes(), [{start: 1, end: 4}]);
    });
    
})();
