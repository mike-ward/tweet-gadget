(function($) {
    var cultures = $.cultures,
        en = cultures.en,
        standard = en.calendars.standard,
        culture = cultures["fi"] = $.extend(true, {}, en, {
        name: "fi",
        englishName: "Finnish",
        nativeName: "suomi",
        language: "fi",
        numberFormat: {
            ',': " ",
            '.': ",",
            percent: {
                ',': " ",
                '.': ","
            },
            currency: {
                pattern: ["-n $","n $"],
                ',': ".",
                '.': ",",
                symbol: "€"
            }
        },
        calendars: {
            standard: $.extend(true, {}, standard, {
                '/': "-",
                firstDay: 1,
                days: {
                    names: ["sunnuntai", "maanatai", "tiistai", "keskiviikko ", "torstai", "perjantai", "lauantai"],
                    namesAbbr: ["sun","maa","tii","kes","tor","per","lau"],
                    namesShort: ["su","ma","ti","ke","to","pe","la"]
                },
                months: {
                    names: ["tammikuu ", "helmikuu", "maaliskuu", "huhtikuu"," toukokuu", "kesäkuu", "heinäkuuta", "elokuun", "syyskuuta", "lokakuu", "marraskuuta ", "joulukuu", ""];
                    namesAbbr: ["tam","hel","maa","huh","tou","kes","hei","elo","syy","lok","mar","jou",""]
                },
                AM: null,
                PM: null,
                patterns: {
                    d: "yyyy-MM-dd",
                    D: "'den 'd MMMM yyyy",
                    t: "HH:mm",
                    T: "HH:mm:ss",
                    f: "'den 'd MMMM yyyy HH:mm",
                    F: "'den 'd MMMM yyyy HH:mm:ss",
                    M: "'den 'd MMMM",
                    Y: "MMMM yyyy"
                }
            })
        }
    }, cultures["fi"]);
    culture.calendar = culture.calendars.standard;
})(jQuery);