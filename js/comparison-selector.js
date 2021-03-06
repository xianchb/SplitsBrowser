/*
 *  SplitsBrowser ComparisonSelector - Provides a choice of 'reference' competitors.
 *  
 *  Copyright (C) 2000-2014 Dave Ryder, Reinhard Balling, Andris Strazdins,
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
    
    var getMessage = SplitsBrowser.getMessage;
    var getMessageWithFormatting = SplitsBrowser.getMessageWithFormatting;
    
    var ALL_COMPARISON_OPTIONS = [
        {
            nameKey: "CompareWithWinner",
            selector: function (courseClassSet) { return courseClassSet.getWinnerCumTimes(); },
            requiresWinner: true,
            percentage: ""
        },
        {
            nameKey: "CompareWithFastestTime",
            selector: function (courseClassSet) { return courseClassSet.getFastestCumTimes(); },
            requiresWinner: false,
            percentage: ""
        }
    ];
    
    // All 'Fastest time + N %' values (not including zero).
    var FASTEST_PLUS_PERCENTAGES = [5, 25, 50, 100];
    
    FASTEST_PLUS_PERCENTAGES.forEach(function (percent) {
        ALL_COMPARISON_OPTIONS.push({
            nameKey: "CompareWithFastestTimePlusPercentage",
            selector: function (courseClassSet) { return courseClassSet.getFastestCumTimesPlusPercentage(percent); },
            requiresWinner: false, 
            percentage: percent
        });
    });
    
    ALL_COMPARISON_OPTIONS.push({
        nameKey: "CompareWithAnyRunner",
        selector: null,
        requiresWinner: true,
        percentage: ""
    });
    
    // Default selected index of the comparison function.
    var DEFAULT_COMPARISON_INDEX = 1; // 1 = fastest time.
    
    // The id of the comparison selector.
    var COMPARISON_SELECTOR_ID = "comparisonSelector";
    
    // The id of the runner selector
    var RUNNER_SELECTOR_ID = "runnerSelector";

    /**
    * A control that wraps a drop-down list used to choose what to compare
    * times against.
    * @param {HTMLElement} parent - The parent element to add the control to.
    * @param {Function} alerter - Function to call with any messages to show to
    *     the user.
    */
    function ComparisonSelector(parent, alerter) {
        this.changeHandlers = [];
        this.classes = null;
        this.currentRunnerIndex = null;
        this.previousCompetitorList = null;
        this.parent = parent;
        this.alerter = alerter;
        this.hasWinner = false;
        this.previousSelectedIndex = -1;
        
        var div = d3.select(parent).append("div")
                                   .classed("topRowStart", true);
        
        this.comparisonSelectorLabel = div.append("span")
                                          .classed("comparisonSelectorLabel", true);
        

        var outerThis = this;
        this.dropDown = div.append("select")
                           .attr("id", COMPARISON_SELECTOR_ID)
                           .node();
                            
        $(this.dropDown).bind("change", function() { outerThis.onSelectionChanged(); });

        this.optionsList = d3.select(this.dropDown).selectAll("option")
                                                   .data(ALL_COMPARISON_OPTIONS);
        this.optionsList.enter().append("option");
        
        this.optionsList = d3.select(this.dropDown).selectAll("option")
                                                   .data(ALL_COMPARISON_OPTIONS);
        this.optionsList.attr("value", function (_opt, index) { return index.toString(); });
                   
        this.optionsList.exit().remove();
        
        this.runnerDiv = d3.select(parent).append("div")
                                          .classed("topRowStart", true)
                                          .style("display", "none")
                                          .style("padding-left", "20px");
        
        this.runnerSpan = this.runnerDiv.append("span")
                                        .classed("comparisonSelectorLabel", true);
        
        this.runnerDropDown = this.runnerDiv.append("select")
                                            .attr("id", RUNNER_SELECTOR_ID)
                                            .node();
                                            
        $(this.runnerDropDown).bind("change", function () { outerThis.onSelectionChanged(); });
        
        this.dropDown.selectedIndex = DEFAULT_COMPARISON_INDEX;
        this.previousSelectedIndex = DEFAULT_COMPARISON_INDEX;
        
        this.setMessages();
    }

    /**
    * Sets the messages in this control, following its creation or a change of
    * selected language.
    */ 
    ComparisonSelector.prototype.setMessages = function () {
        this.comparisonSelectorLabel.text(getMessage("ComparisonSelectorLabel"));    
        this.runnerSpan.text(getMessage("CompareWithAnyRunnerLabel"));
        this.optionsList.text(function (opt) { return getMessageWithFormatting(opt.nameKey, {"$$PERCENT$$": opt.percentage}); });
    };

    /**
    * Add a change handler to be called whenever the selected class is changed.
    *
    * The function used to return the comparison result is returned.
    *
    * @param {Function} handler - Handler function to be called whenever the class
    *                   changes.
    */
    ComparisonSelector.prototype.registerChangeHandler = function(handler) {
        if (this.changeHandlers.indexOf(handler) === -1) {
            this.changeHandlers.push(handler);
        }    
    };

    /**
    * Returns whether the 'Any Runner...' option is selected.
    * @return {boolean} True if the 'Any Runner...' option is selected, false
    *     if any other option is selected.
    */
    ComparisonSelector.prototype.isAnyRunnerSelected = function () {
        return this.dropDown.selectedIndex === ALL_COMPARISON_OPTIONS.length - 1;
    };
    
    /**
    * Sets the course-class set to use.
    * @param {CourseClassSet} courseClassSet - The course-class set to set.
    */
    ComparisonSelector.prototype.setCourseClassSet = function (courseClassSet) {
        this.courseClassSet = courseClassSet;
        this.setRunners();
    };

    /**
    * Populates the drop-down list of runners from a course-class set.
    */
    ComparisonSelector.prototype.setRunners = function () {
        var competitors = this.courseClassSet.allCompetitors;
        var completingCompetitorIndexes = d3.range(competitors.length).filter(function (idx) { return competitors[idx].completed(); });
        var completingCompetitors = competitors.filter(function (comp) { return comp.completed(); });
        
        this.hasWinner = (completingCompetitors.length > 0);
        
        var optionsList = d3.select(this.runnerDropDown).selectAll("option")
                                                        .data(completingCompetitors);
        
        optionsList.enter().append("option");
        optionsList = d3.select(this.runnerDropDown).selectAll("option")
                                                    .data(completingCompetitors);
        optionsList.attr("value", function (_comp, complCompIndex) { return completingCompetitorIndexes[complCompIndex].toString(); })
                   .text(function (comp) { return comp.name; });
        optionsList.exit().remove();

        if (this.previousCompetitorList === null) {
            this.currentRunnerIndex = 0;
        } else if (this.hasWinner) {
            var oldSelectedRunner = this.previousCompetitorList[this.currentRunnerIndex];
            var newIndex = this.courseClassSet.allCompetitors.indexOf(oldSelectedRunner);
            this.currentRunnerIndex = Math.max(newIndex, 0);
        } else if (ALL_COMPARISON_OPTIONS[this.dropDown.selectedIndex].requiresWinner) {
            // We're currently viewing a comparison type that requires a
            // winner.  However, there is no longer a winner, presumably
            // because there was a winner but following the removal of a class
            // there isn't any more.  Switch back to the fastest time.
            this.setComparisonType(1, null);
        }
        
        this.runnerDropDown.selectedIndex = this.currentRunnerIndex;
       
        this.previousCompetitorList = this.courseClassSet.allCompetitors;
    };
    
    /**
    * Sets whether the control is enabled.
    * @param {boolean} isEnabled - True if the control is enabled, false if
    *      disabled.
    */
    ComparisonSelector.prototype.setEnabled = function (isEnabled) {
        d3.select(this.parent).selectAll("span.comparisonSelectorLabel")
                              .classed("disabled", !isEnabled);
                              
        this.dropDown.disabled = !isEnabled;
        this.runnerDropDown.disabled = !isEnabled;
    };
    
    /**
    * Returns the function that compares a competitor's splits against some
    * reference data.
    * @return {Function} Comparison function.
    */
    ComparisonSelector.prototype.getComparisonFunction = function () {
        if (this.isAnyRunnerSelected()) {
            var outerThis = this;
            return function (courseClassSet) { return courseClassSet.getCumulativeTimesForCompetitor(outerThis.currentRunnerIndex); };
        } else {
            return ALL_COMPARISON_OPTIONS[this.dropDown.selectedIndex].selector;
        }
    };
    
    /**
    * Returns the comparison type.
    * @return {Object} Object containing the comparison type (type index and runner).
    */
    ComparisonSelector.prototype.getComparisonType = function () {
        var typeIndex = this.dropDown.selectedIndex;
        var runner;
        if (typeIndex === ALL_COMPARISON_OPTIONS.length - 1) {
            if (this.runnerDropDown.selectedIndex < 0) {
                this.runnerDropDown.selectedIndex = 0;
            }
            
            runner = this.courseClassSet.allCompetitors[this.runnerDropDown.selectedIndex];
        } else {
            runner = null;
        }
    
        return {index: typeIndex, runner: runner };
    };
    
    /**
    * Sets the comparison type.
    * @param {Number} typeIndex - The index of the comparison type.
    * @param {Competitor|null} runner - The selected 'Any runner', or null if
    *     Any Runner has not been selected.
    */
    ComparisonSelector.prototype.setComparisonType = function (typeIndex, runner) {
        if (0 <= typeIndex && typeIndex < ALL_COMPARISON_OPTIONS.length) {
            if (typeIndex === ALL_COMPARISON_OPTIONS.length - 1) {
                var runnerIndex = this.courseClassSet.allCompetitors.indexOf(runner);
                if (runnerIndex >= 0) {
                    this.dropDown.selectedIndex = typeIndex;
                    this.runnerDropDown.selectedIndex = runnerIndex;
                    this.onSelectionChanged();
                }
            } else {
                this.dropDown.selectedIndex = typeIndex;
                this.onSelectionChanged();
            }
        }
    };
    
    /**
    * Handle a change of the selected option in either drop-down list.
    */
    ComparisonSelector.prototype.onSelectionChanged = function() {
        var runnerDropdownSelectedIndex = Math.max(this.runnerDropDown.selectedIndex, 0);
        var option = ALL_COMPARISON_OPTIONS[this.dropDown.selectedIndex];
        if (!this.hasWinner && option.requiresWinner) {
            // No winner on this course means you can't select this option.
            this.alerter(getMessageWithFormatting("CannotCompareAsNoWinner", {"$$OPTION$$": getMessage(option.nameKey)}));
            this.dropDown.selectedIndex = this.previousSelectedIndex;
        } else {
            this.runnerDiv.style("display", (this.isAnyRunnerSelected()) ? null : "none");
            this.currentRunnerIndex = (this.runnerDropDown.options.length === 0) ? 0 : parseInt(this.runnerDropDown.options[runnerDropdownSelectedIndex].value, 10);
            this.previousSelectedIndex = this.dropDown.selectedIndex;
            this.changeHandlers.forEach(function (handler) { handler(this.getComparisonFunction()); }, this);
        }
    };
    
    SplitsBrowser.Controls.ComparisonSelector = ComparisonSelector;
})();
