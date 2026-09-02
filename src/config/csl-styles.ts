export const IEEE_CSL = `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0" demote-non-dropping-particle="sort-only">
  <info>
    <title>IEEE Reference Guide version 11.29.2023</title>
    <title-short>Institute of Electrical and Electronics Engineers</title-short>
    <id>http://www.zotero.org/styles/ieee</id>
    <link href="http://www.zotero.org/styles/ieee" rel="self"/>
    <link href="https://journals.ieeeauthorcenter.ieee.org/your-role-in-article-production/ieee-editorial-style-manual/" rel="documentation"/>
    <author>
      <name>Michael Berkowitz</name>
      <email>mberkowi@gmu.edu</email>
    </author>
    <contributor>
      <name>Julian Onions</name>
      <email>julian.onions@gmail.com</email>
    </contributor>
    <contributor>
      <name>Rintze Zelle</name>
      <uri>http://twitter.com/rintzezelle</uri>
    </contributor>
    <contributor>
      <name>Stephen Frank</name>
      <uri>http://www.zotero.org/sfrank</uri>
    </contributor>
    <contributor>
      <name>Sebastian Karcher</name>
    </contributor>
    <contributor>
      <name>Giuseppe Silano</name>
      <email>g.silano89@gmail.com</email>
      <uri>http://giuseppesilano.net</uri>
    </contributor>
    <contributor>
      <name>Patrick O'Brien</name>
    </contributor>
    <contributor>
      <name>Brenton M. Wiernik</name>
    </contributor>
    <contributor>
      <name>Oliver Couch</name>
      <email>oliver.couch@gmail.com</email>
    </contributor>
    <contributor>
      <name>Andrew Dunning</name>
      <uri>https://orcid.org/0000-0003-0464-5036</uri>
    </contributor>
    <category citation-format="numeric"/>
    <category field="engineering"/>
    <category field="generic-base"/>
    <summary>IEEE style as per the 2023 guidelines.</summary>
    <updated>2024-03-27T11:41:27+00:00</updated>
    <rights license="http://creativecommons.org/licenses/by-sa/3.0/">This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 License</rights>
  </info>
  <locale xml:lang="en">
    <date form="text">
      <date-part name="month" form="short" suffix=" "/>
      <date-part name="day" form="numeric-leading-zeros" suffix=", "/>
      <date-part name="year"/>
    </date>
    <terms>
      <term name="chapter" form="short">ch.</term>
      <term name="chapter-number" form="short">ch.</term>
      <term name="presented at">presented at the</term>
      <term name="available at">available</term>
      <term name="month-06" form="short">Jun.</term>
      <term name="month-07" form="short">Jul.</term>
      <term name="month-09" form="short">Sep.</term>
    </terms>
  </locale>
  <macro name="status">
    <choose>
      <if variable="page issue volume" match="none">
        <text variable="status" text-case="capitalize-first" suffix="" font-weight="bold"/>
      </if>
    </choose>
  </macro>
  <macro name="edition">
    <choose>
      <if type="bill book chapter graphic legal_case legislation motion_picture paper-conference report song" match="any">
        <choose>
          <if is-numeric="edition">
            <group delimiter=" ">
              <number variable="edition" form="ordinal"/>
              <text term="edition" form="short"/>
            </group>
          </if>
          <else>
            <text variable="edition" text-case="capitalize-first" suffix="."/>
          </else>
        </choose>
      </if>
    </choose>
  </macro>
  <macro name="issued">
    <choose>
      <if type="article-journal report" match="any">
        <date variable="issued">
          <date-part name="month" form="short" suffix=" "/>
          <date-part name="year" form="long"/>
        </date>
      </if>
      <else-if type="bill book chapter graphic legal_case legislation song thesis" match="any">
        <date variable="issued">
          <date-part name="year" form="long"/>
        </date>
      </else-if>
      <else-if type="paper-conference" match="any">
        <date variable="issued">
          <date-part name="month" form="short"/>
          <date-part name="year" prefix=" "/>
        </date>
      </else-if>
      <else-if type="motion_picture" match="any">
        <date variable="issued" form="text" prefix="(" suffix=")"/>
      </else-if>
      <else>
        <date variable="issued" form="text"/>
      </else>
    </choose>
  </macro>
  <macro name="author">
    <names variable="author">
      <name and="text" et-al-min="7" et-al-use-first="1" initialize-with=". "/>
      <label form="short" prefix=", " text-case="capitalize-first"/>
      <et-al font-style="italic"/>
      <substitute>
        <names variable="editor"/>
        <names variable="translator"/>
        <text macro="director"/>
      </substitute>
    </names>
  </macro>
  <macro name="editor">
    <names variable="editor">
      <name initialize-with=". " delimiter=", " and="text"/>
      <label form="short" prefix=", " text-case="capitalize-first"/>
    </names>
  </macro>
  <macro name="director">
    <names variable="director">
      <name and="text" et-al-min="7" et-al-use-first="1" initialize-with=". "/>
      <et-al font-style="italic"/>
    </names>
  </macro>
  <macro name="locators">
    <group delimiter=", ">
      <text macro="edition"/>
      <group delimiter=" ">
        <text term="volume" form="short"/>
        <number variable="volume" form="numeric"/>
      </group>
      <group delimiter=" ">
        <number variable="number-of-volumes" form="numeric"/>
        <text term="volume" form="short" plural="true"/>
      </group>
      <group delimiter=" ">
        <text term="issue" form="short"/>
        <number variable="issue" form="numeric"/>
      </group>
    </group>
  </macro>
  <macro name="title">
    <choose>
      <if type="bill book graphic legal_case legislation motion_picture song standard software" match="any">
        <text variable="title" font-style="italic"/>
      </if>
      <else>
        <text variable="title" quotes="true"/>
      </else>
    </choose>
  </macro>
  <macro name="publisher">
    <choose>
      <if type="bill book chapter graphic legal_case legislation motion_picture paper-conference song" match="any">
        <group delimiter=": ">
          <text variable="publisher-place"/>
          <text variable="publisher"/>
        </group>
      </if>
      <else>
        <group delimiter=", ">
          <text variable="publisher"/>
          <text variable="publisher-place"/>
        </group>
      </else>
    </choose>
  </macro>
  <macro name="event">
    <choose>
      <if type="paper-conference speech" match="any">
        <choose>
          <if variable="container-title" match="any">
            <group delimiter=" ">
              <text term="in"/>
              <text variable="container-title" font-style="italic"/>
            </group>
          </if>
          <else>
            <group delimiter=" ">
              <text term="presented at"/>
              <text variable="event"/>
            </group>
          </else>
        </choose>
      </if>
    </choose>
  </macro>
  <macro name="access">
    <choose>
      <if type="webpage post post-weblog" match="any">
        <choose>
          <if variable="URL">
            <group delimiter=". " prefix=" ">
              <group delimiter=": ">
                <text term="accessed" text-case="capitalize-first"/>
                <date variable="accessed" form="text"/>
              </group>
              <text term="online" prefix="[" suffix="]" text-case="capitalize-first"/>
              <group delimiter=": ">
                <text term="available at" text-case="capitalize-first"/>
                <text variable="URL"/>
              </group>
            </group>
          </if>
        </choose>
      </if>
      <else-if match="any" variable="DOI">
        <text variable="DOI" prefix=" doi: " suffix="."/>
      </else-if>
      <else-if variable="URL">
        <group delimiter=". " prefix=" " suffix=". ">
          <group delimiter=": ">
            <text term="accessed" text-case="capitalize-first"/>
            <date variable="accessed" form="text"/>
          </group>
          <group prefix="[" suffix="]" delimiter=" ">
            <choose>
              <if variable="medium" match="any">
                <text variable="medium" text-case="capitalize-first"/>
              </if>
              <else>
                <text term="online" text-case="capitalize-first"/>
                <choose>
                  <if type="motion_picture">
                    <text term="video" text-case="capitalize-first"/>
                  </if>
                </choose>
              </else>
            </choose>
          </group>
        </group>
        <group delimiter=": " prefix=" ">
          <text term="available at" text-case="capitalize-first"/>
          <text variable="URL"/>
        </group>
      </else-if>
    </choose>
  </macro>
  <macro name="page">
    <choose>
      <if type="article-journal" variable="number" match="all">
        <group delimiter=" ">
          <text value="Art."/>
          <text term="issue" form="short"/>
          <text variable="number"/>
        </group>
      </if>
      <else>
        <group delimiter=" ">
          <label variable="page" form="short"/>
          <text variable="page"/>
        </group>
      </else>
    </choose>
  </macro>
  <macro name="citation-locator">
    <group delimiter=" ">
      <choose>
        <if locator="page">
          <label variable="locator" form="short"/>
        </if>
        <else>
          <label variable="locator" form="short" text-case="capitalize-first"/>
        </else>
      </choose>
      <text variable="locator"/>
    </group>
  </macro>
  <macro name="geographic-location">
    <group delimiter=", " suffix=".">
      <choose>
        <if variable="publisher-place">
          <text variable="publisher-place" text-case="title"/>
        </if>
        <else-if variable="event-place">
          <text variable="event-place" text-case="title"/>
        </else-if>
      </choose>
    </group>
  </macro>
  <macro name="collection">
    <choose>
      <if variable="collection-title" match="any">
        <text term="in" suffix=" "/>
        <group delimiter=", " suffix=". ">
          <text variable="collection-title"/>
          <text variable="collection-number" prefix="no. "/>
          <text variable="volume" prefix="vol. "/>
        </group>
      </if>
    </choose>
  </macro>
  <citation>
    <sort>
      <key variable="citation-number"/>
    </sort>
    <layout delimiter=", ">
      <group prefix="[" suffix="]" delimiter=", ">
        <text variable="citation-number"/>
        <text macro="citation-locator"/>
      </group>
    </layout>
  </citation>
  <bibliography entry-spacing="0" second-field-align="flush">
    <layout>
      <text variable="citation-number" prefix="[" suffix="]"/>
      <text macro="author" suffix=", "/>
      <choose>
        <if type="article-journal">
          <group delimiter=", ">
            <text macro="title"/>
            <text variable="container-title" font-style="italic" form="short"/>
            <text macro="locators"/>
            <text macro="page"/>
            <text macro="issued"/>
            <text macro="status"/>
          </group>
          <choose>
            <if variable="URL DOI" match="none">
              <text value="."/>
            </if>
            <else>
              <text value=","/>
            </else>
          </choose>
          <text macro="access"/>
        </if>
        <else-if type="paper-conference speech" match="any">
          <group delimiter=", " suffix=", ">
            <text macro="title"/>
            <text macro="event"/>
            <text macro="editor"/>
          </group>
          <text macro="collection"/>
          <group delimiter=", " suffix=".">
            <text macro="publisher"/>
            <text macro="issued"/>
            <text macro="page"/>
            <text macro="status"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="chapter">
          <group delimiter=", " suffix=".">
            <text macro="title"/>
            <group delimiter=" ">
              <text term="in" suffix=" "/>
              <text variable="container-title" font-style="italic"/>
            </group>
            <text macro="locators"/>
            <text macro="editor"/>
            <text macro="collection"/>
            <text macro="publisher"/>
            <text macro="issued"/>
            <group delimiter=" ">
              <label variable="chapter-number" form="short"/>
              <text variable="chapter-number"/>
            </group>
            <text macro="page"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="report">
          <group delimiter=", " suffix=".">
            <text macro="title"/>
            <text macro="publisher"/>
            <group delimiter=" ">
              <text variable="genre"/>
              <text variable="number"/>
            </group>
            <text macro="issued"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="thesis">
          <group delimiter=", " suffix=".">
            <text macro="title"/>
            <text variable="genre"/>
            <text macro="publisher"/>
            <text macro="issued"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="software">
          <group delimiter=". " suffix=".">
            <text macro="title"/>
            <text macro="issued" prefix="(" suffix=")"/>
            <text variable="genre"/>
            <text macro="publisher"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="article">
          <group delimiter=", " suffix=".">
            <text macro="title"/>
            <text macro="issued"/>
            <group delimiter=": ">
              <text macro="publisher" font-style="italic"/>
              <text variable="number"/>
            </group>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="webpage post-weblog post" match="any">
          <group delimiter=", " suffix=".">
            <text macro="title"/>
            <text variable="container-title"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="patent">
          <group delimiter=", ">
            <text macro="title"/>
            <text variable="number"/>
            <text macro="issued"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="motion_picture">
          <text macro="geographic-location" suffix=". "/>
          <group delimiter=", " suffix=".">
            <text macro="title"/>
            <text macro="issued"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="standard">
          <group delimiter=", " suffix=".">
            <text macro="title"/>
            <group delimiter=" ">
              <text variable="genre"/>
              <text variable="number"/>
            </group>
            <text macro="geographic-location"/>
            <text macro="issued"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="bill book graphic legal_case legislation report song" match="any">
          <group delimiter=", " suffix=". ">
            <text macro="title"/>
            <text macro="locators"/>
          </group>
          <text macro="collection"/>
          <group delimiter=", " suffix=".">
            <text macro="publisher"/>
            <text macro="issued"/>
            <text macro="page"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else-if type="article-magazine article-newspaper broadcast interview manuscript map patent personal_communication song speech thesis webpage" match="any">
          <group delimiter=", " suffix=".">
            <text macro="title"/>
            <text variable="container-title" font-style="italic"/>
            <text macro="locators"/>
            <text macro="publisher"/>
            <text macro="page"/>
            <text macro="issued"/>
          </group>
          <text macro="access"/>
        </else-if>
        <else>
          <group delimiter=", " suffix=". ">
            <text macro="title"/>
            <text variable="container-title" font-style="italic"/>
            <text macro="locators"/>
          </group>
          <text macro="collection"/>
          <group delimiter=", " suffix=".">
            <text macro="publisher"/>
            <text macro="page"/>
            <text macro="issued"/>
          </group>
          <text macro="access"/>
        </else>
      </choose>
    </layout>
  </bibliography>
</style>`;

export const AMS_CSL = `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0" default-locale="en-US">
  <info>
    <title>American Mathematical Society (numeric)</title>
    <title-short>AMS</title-short>
    <id>http://www.zotero.org/styles/american-mathematical-society-numeric</id>
    <link href="http://www.zotero.org/styles/american-mathematical-society-numeric" rel="self"/>
    <link href="http://www.zotero.org/styles/elsevier-with-titles" rel="template"/>
    <link href="https://www.ams.org/arc/styleguide" rel="documentation"/>
    <link href="https://mirrors.ctan.org/biblio/bibtex/contrib/misc/amsplain.bst" rel="documentation"/>
    <author>
      <name>American Mathematical Society</name>
      <uri>https://www.ams.org</uri>
      <email>tech-support@ams.org</email>
    </author>
    <contributor>
      <name>Lucian Chauvin</name>
      <uri>https://lucianchauvin.com</uri>
      <email>me@lucianchauvin.com</email>
    </contributor>
    <category citation-format="numeric"/>
    <category field="math"/>
    <updated>2025-12-16T17:28:05+00:00</updated>
    <rights license="http://creativecommons.org/licenses/by-sa/3.0/">This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 License</rights>
  </info>
  <macro name="author">
    <names variable="author">
      <name name-as-sort-order="all" sort-separator=", " initialize="false" delimiter=", " and="text" delimiter-precedes-last="always"/>
      <label form="short" prefix=", "/>
      <substitute>
        <names variable="editor"/>
        <names variable="translator"/>
      </substitute>
    </names>
  </macro>
  <macro name="editor">
    <names variable="editor">
      <name name-as-sort-order="all" sort-separator=", " initialize="false" delimiter=", " and="text"/>
      <label form="short" prefix=" (" suffix=")"/>
    </names>
  </macro>
  <macro name="title">
    <choose>
      <if type="bill book graphic legal_case legislation motion_picture report song" match="any">
        <text variable="title" font-style="italic"/>
      </if>
      <else>
        <text variable="title"/>
      </else>
    </choose>
  </macro>
  <macro name="publisher">
    <group delimiter=", ">
      <text variable="publisher"/>
      <text variable="publisher-place"/>
    </group>
  </macro>
  <macro name="edition">
    <choose>
      <if is-numeric="edition">
        <group delimiter=" ">
          <number variable="edition" form="ordinal"/>
          <text term="edition" form="short"/>
        </group>
      </if>
      <else>
        <text variable="edition"/>
      </else>
    </choose>
  </macro>
  <macro name="locators">
    <choose>
      <if type="article-journal">
        <group delimiter=" ">
          <text variable="volume" font-weight="bold"/>
          <group delimiter=" ">
            <label variable="issue" form="short"/>
            <text variable="issue"/>
          </group>
          <date variable="issued" prefix="(" suffix=")">
            <date-part name="year"/>
          </date>
        </group>
      </if>
      <else-if type="bill book graphic legal_case legislation motion_picture report song" match="any">
        <group delimiter=", ">
          <group delimiter=" ">
            <text term="volume" form="short"/>
            <text variable="volume"/>
          </group>
          <text variable="collection-title"/>
        </group>
      </else-if>
    </choose>
  </macro>
  <citation collapse="citation-number">
    <sort>
      <key variable="citation-number"/>
    </sort>
    <layout prefix="[" suffix="]" delimiter=", ">
      <text variable="citation-number"/>
    </layout>
  </citation>
  <bibliography entry-spacing="0" second-field-align="flush">
    <layout suffix=".">
      <text variable="citation-number" prefix="[" suffix="] "/>
      <group delimiter=", ">
        <text macro="author"/>
        <text macro="title"/>
        <choose>
          <if type="article-journal">
            <group delimiter=" ">
              <text variable="container-title" font-style="normal"/>
              <text macro="locators"/>
              <text variable="page"/>
            </group>
          </if>
          <else-if type="chapter paper-conference" match="any">
            <group delimiter=", ">
              <group delimiter=" ">
                <text term="in"/>
                <text variable="container-title" font-style="italic"/>
                <text macro="editor" prefix="(" suffix=")"/>
              </group>
              <text macro="locators"/>
              <text macro="publisher"/>
              <group delimiter=" ">
                <label variable="page" form="short"/>
                <text variable="page"/>
              </group>
            </group>
          </else-if>
          <else-if type="thesis">
            <text variable="genre"/>
            <text variable="publisher"/>
            <date variable="issued">
              <date-part name="year"/>
            </date>
          </else-if>
          <else>
            <text macro="edition"/>
            <text macro="locators"/>
            <text macro="publisher"/>
            <date variable="issued">
              <date-part name="year"/>
            </date>
          </else>
        </choose>
      </group>
      <text variable="status" prefix=", "/>
    </layout>
  </bibliography>
</style>`;

export const MLA_CSL = `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" and="text" class="in-text" demote-non-dropping-particle="never" initialize-with=". " page-range-format="minimal-two" version="1.0">
  <!-- This file was generated by the Style Variant Builder <https://github.com/citation-style-language/style-variant-builder>. To contribute changes, modify the template and regenerate variants. -->
  <info>
    <title>MLA Handbook 9th edition (in-text citations)</title>
    <title-short>Modern Language Association (in-text citations)</title-short>
    <id>http://www.zotero.org/styles/modern-language-association</id>
    <link href="http://www.zotero.org/styles/modern-language-association" rel="self"/>
    <link href="https://style.mla.org/" rel="documentation"/>
    <link href="https://zotero.org/groups/2205533/collections/L96HMJXY" rel="documentation"/>
    <author>
      <name>Sebastian Karcher</name>
      <uri>https://orcid.org/0000-0001-8249-7388</uri>
    </author>
    <author>
      <name>Andrew Dunning</name>
      <uri>https://orcid.org/0000-0003-0464-5036</uri>
    </author>
    <contributor>
      <name>Patrick O'Brien</name>
    </contributor>
    <category citation-format="author"/>
    <category field="generic-base"/>
    <category field="humanities"/>
    <category field="literature"/>
    <summary>MLA source citations, in-text citations system (chapter 6)</summary>
    <updated>2026-02-03T00:00:00+00:00</updated>
    <rights license="http://creativecommons.org/licenses/by-sa/3.0/">This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 License</rights>
  </info>
  <locale xml:lang="en">
    <date form="text">
      <date-part name="day" suffix=" "/>
      <date-part form="short" name="month" suffix=" "/>
      <date-part name="year"/>
    </date>
    <terms>
      <!-- MLA Appendix 1 -->
      <term form="short" name="chapter">
        <single>ch.</single>
        <multiple>chs.</multiple>
      </term>
      <term name="collection-editor">
        <single>general editor</single>
        <multiple>general editors</multiple>
      </term>
      <term name="editor-translator">
        <single>editor and translator</single>
        <multiple>editors and translators</multiple>
      </term>
      <term name="editortranslator">
        <single>editor and translator</single>
        <multiple>editors and translators</multiple>
      </term>
      <term form="verb" name="editor-translator">edited and translated by</term>
      <term form="verb" name="editortranslator">edited and translated by</term>
      <term name="original-work-published">originally published</term>
      <term form="short" name="paragraph">
        <single>par.</single>
        <multiple>pars.</multiple>
      </term>
      <term form="short" name="version">vers.</term>
    </terms>
  </locale>
  <!-- Contents:

       MLA provides the following series of elements for citations:

       1. Author (MLA 5.3-22)
       2. Title of Source (MLA 5.23-30)
       3. Supplemental Element after Title of Source (MLA 5.106-109)
          3.1. Contributor (MLA 5.107)
          3.2. Original publication date (MLA 5.108)
          3.3. Section of a work labeled generically (MLA 5.109)
       4. Container 1
          4.1. Title of Container (MLA 5.31-37)
          4.2. Contributor (MLA 5.38-47)
          4.3. Version (MLA 5.48-50)
          4.4. Number (MLA 5.51-53)
          4.5. Publisher (MLA 5.54-67)
          4.6. Publication Date (MLA 5.68-83)
          4.7. Location (MLA 5.84-99)
       5. Supplemental Element Between Containers (MLA 5.119)
       6. Container 2 (MLA 5.102)
       7. Supplemental Element at End of Entry (MLA 5.110-118)
          7.1. Date of access (MLA 5.111)
          7.2. Medium of publication (MLA 5.112)
          7.3. Dissertations and theses (MLA 5.113)
          7.4. Publication history (MLA 5.114)
          7.5. Book series (MLA 5.115)
          7.6. Columns, sections, and other recurring titled features (MLA 5.116)
          7.7. Multivolume works (MLA 5.117)
  -->
  <!-- Categories of CSL item types:

       Serial
       : article-journal article-magazine article-newspaper periodical post-weblog review review-book

       Serial or Monographic
       : interview paper-conference

         Monographic with any of 'collection-editor compiler editor editorial-director'.
         A serial 'paper-conference' is unpublished if it lacks any of 'issue page supplement-number volume'.

       Monographic
       : article book broadcast chapter classic collection dataset document
         entry entry-dictionary entry-encyclopedia event figure
         graphic manuscript map motion_picture musical_score
         pamphlet patent performance personal_communication post report
         software song speech standard thesis webpage

       Legal
       : bill hearing legal_case legislation regulation treaty
  -->
  <!-- Variable labels -->
  <macro name="label-edition-capitalized">
    <group delimiter=" ">
      <choose>
        <if is-numeric="edition">
          <number form="ordinal" variable="edition"/>
          <label form="short" variable="edition"/>
        </if>
        <else>
          <text text-case="capitalize-first" variable="edition"/>
        </else>
      </choose>
    </group>
  </macro>
  <macro name="label-issue">
    <group delimiter=" ">
      <label form="short" variable="issue"/>
      <text variable="issue"/>
    </group>
  </macro>
  <macro name="label-locator">
    <group delimiter=" ">
      <label form="short" variable="locator"/>
      <text variable="locator"/>
    </group>
  </macro>
  <macro name="label-number">
    <group delimiter=" ">
      <choose>
        <if type="standard"/>
        <else-if is-numeric="number">
          <label form="short" variable="number"/>
        </else-if>
      </choose>
      <text variable="number"/>
    </group>
  </macro>
  <macro name="label-number-of-volumes">
    <group delimiter=" ">
      <text variable="number-of-volumes"/>
      <choose>
        <if is-numeric="number-of-volumes">
          <label form="short" variable="number-of-volumes"/>
        </if>
      </choose>
    </group>
  </macro>
  <macro name="label-page">
    <group delimiter=" ">
      <label form="short" variable="page"/>
      <text variable="page"/>
    </group>
  </macro>
  <macro name="label-part-number">
    <group delimiter=" ">
      <choose>
        <if is-numeric="part-number">
          <!-- TODO: Replace with 'part-number' label when CSL provides one -->
          <text form="short" term="part"/>
        </if>
      </choose>
      <text variable="part-number"/>
    </group>
  </macro>
  <macro name="label-part-number-capitalized">
    <group delimiter=" ">
      <choose>
        <if is-numeric="part-number">
          <!-- TODO: Replace with 'part-number' label when CSL provides one -->
          <text form="short" term="part" text-case="capitalize-first"/>
        </if>
      </choose>
      <text text-case="capitalize-first" variable="part-number"/>
    </group>
  </macro>
  <macro name="label-supplement-number">
    <group delimiter=" ">
      <choose>
        <!-- TODO: Replace with 'supplement-number' label when CSL provides one -->
        <if is-numeric="supplement-number">
          <text form="short" term="supplement"/>
        </if>
      </choose>
      <text variable="supplement-number"/>
    </group>
  </macro>
  <macro name="label-version">
    <group delimiter=" ">
      <label variable="version"/>
      <text variable="version"/>
    </group>
  </macro>
  <macro name="label-version-capitalized">
    <group delimiter=" ">
      <label text-case="capitalize-first" variable="version"/>
      <text variable="version"/>
    </group>
  </macro>
  <macro name="label-volume">
    <group delimiter=" ">
      <choose>
        <if is-numeric="volume">
          <label form="short" variable="volume"/>
        </if>
      </choose>
      <text variable="volume"/>
    </group>
  </macro>
  <macro name="label-volume-capitalized">
    <group delimiter=" ">
      <choose>
        <if is-numeric="volume">
          <label form="short" text-case="capitalize-first" variable="volume"/>
        </if>
      </choose>
      <text text-case="capitalize-first" variable="volume"/>
    </group>
  </macro>
  <!-- 1. Author (MLA 5.3-22) -->
  <macro name="author">
    <names variable="composer">
      <name delimiter-precedes-et-al="always" delimiter-precedes-last="always" initialize="false" name-as-sort-order="first"/>
      <label prefix=", "/>
      <substitute>
        <names variable="author"/>
        <names variable="guest">
          <name delimiter-precedes-et-al="always" delimiter-precedes-last="always" initialize="false" name-as-sort-order="first"/>
          <!-- 'guest' has no label (see MLA 'Interview by podcast host') -->
        </names>
        <names variable="editor-translator"/>
        <names variable="editor"/>
        <names variable="translator"/>
        <choose>
          <if type="standard">
            <text variable="authority"/>
          </if>
        </choose>
        <text macro="title"/>
      </substitute>
    </names>
  </macro>
  <macro name="author-short">
    <group delimiter=", ">
      <names variable="composer">
        <name form="short" initialize="true"/>
        <substitute>
          <names variable="author"/>
          <names variable="guest"/>
          <names variable="editor-translator"/>
          <names variable="editor"/>
          <names variable="translator"/>
          <choose>
            <if type="standard">
              <text variable="authority"/>
            </if>
          </choose>
          <text macro="title-short"/>
        </substitute>
      </names>
      <choose>
        <if disambiguate="true">
          <text macro="title-short"/>
        </if>
      </choose>
    </group>
  </macro>
  <!-- 2. Title of Source (MLA 5.23-30) -->
  <macro name="title">
    <choose>
      <if match="any" type="post webpage">
        <!-- print 'container-title' on 'post' or 'webpage' in the same way as 'publisher' -->
        <text macro="title-and-part-filter-review"/>
      </if>
      <else-if match="any" type="article-journal article-magazine article-newspaper periodical post-weblog review review-book">
        <!-- serial types -->
        <text macro="title-and-part-filter-review"/>
      </else-if>
      <else-if match="any" variable="collection-editor compiler editor editorial-director">
        <text macro="title-monographic"/>
      </else-if>
      <else-if match="any" type="interview paper-conference">
        <!-- serial types -->
        <text macro="title-and-part-filter-review"/>
      </else-if>
      <else>
        <text macro="title-monographic"/>
      </else>
    </choose>
  </macro>
  <macro name="title-short">
    <choose>
      <if match="any" type="review review-book" variable="reviewed-author reviewed-genre reviewed-title">
        <!-- If a review has no 'reviewed-title', assume that 'title' contains the title of the reviewed work; the description provides it. -->
        <choose>
          <if variable="reviewed-genre title">
            <!-- Quotes, title case -->
            <text form="short" quotes="true" text-case="title" variable="title"/>
          </if>
          <else-if variable="reviewed-genre reviewed-title title">
            <!-- Quotes, title case -->
            <text form="short" quotes="true" text-case="title" variable="title"/>
          </else-if>
          <else>
            <text macro="supplemental-generic-label-short"/>
          </else>
        </choose>
      </if>
      <else-if variable="title">
        <text macro="title-primary-short"/>
      </else-if>
      <else>
        <text macro="supplemental-generic-label-short"/>
      </else>
    </choose>
  </macro>
  <!-- Title elements -->
  <macro name="title-and-part-filter-review">
    <choose>
      <if match="any" type="review review-book" variable="reviewed-author reviewed-genre reviewed-title">
        <!-- 'title' is only the review title if there is a separate 'reviewed-genre' or 'reviewed-title'; otherwise, it is the title of the reviewed work, printed in the description -->
        <choose>
          <if match="any" variable="reviewed-genre reviewed-title">
            <text macro="title-and-part-title"/>
          </if>
        </choose>
      </if>
      <else>
        <text macro="title-and-part-title"/>
      </else>
    </choose>
  </macro>
  <macro name="title-and-part-title">
    <group delimiter=", ">
      <text macro="title-primary"/>
      <text macro="label-part-number"/>
      <text macro="title-part"/>
    </group>
  </macro>
  <macro name="title-monographic">
    <!-- For monographic items, assume 'part-number' and 'part-title' refer to the book/volume. -->
    <choose>
      <if variable="container-title">
        <text macro="title-primary"/>
      </if>
      <!-- For monographic items without 'container-title', bibliography entries list 'part-title' or 'volume-title' first if available -->
      <else-if variable="part-title">
        <text font-style="italic" text-case="title" variable="part-title"/>
      </else-if>
      <else-if variable="volume-title">
        <text font-style="italic" text-case="title" variable="volume-title"/>
      </else-if>
      <else>
        <text macro="title-primary"/>
      </else>
    </choose>
  </macro>
  <macro name="title-part">
    <choose>
      <if match="any" type="article-journal article-magazine article-newspaper periodical post-weblog review review-book">
        <text quotes="true" text-case="title" variable="part-title"/>
      </if>
      <else-if match="any" variable="collection-editor compiler editor editorial-director">
        <!-- monographic types -->
        <text font-style="italic" text-case="title" variable="part-title"/>
      </else-if>
      <else-if match="any" type="interview paper-conference">
        <!-- serial types -->
        <text quotes="true" text-case="title" variable="part-title"/>
      </else-if>
      <else>
        <!-- monographic types -->
        <text font-style="italic" text-case="title" variable="part-title"/>
      </else>
    </choose>
  </macro>
  <macro name="title-primary">
    <choose>
      <if match="any" type="bill collection legislation regulation treaty">
        <!-- No italics or quotes, title case -->
        <text text-case="title" variable="title"/>
      </if>
      <else-if type="legal_case">
        <!-- Italicized, sentence case -->
        <text font-style="italic" variable="title"/>
      </else-if>
      <else-if match="any" type="book classic graphic hearing map periodical">
        <!-- Italicized, title case (regardless of 'container-title') -->
        <text font-style="italic" text-case="title" variable="title"/>
      </else-if>
      <else-if type="post">
        <!-- Quotes, sentence case -->
        <text quotes="true" variable="title"/>
      </else-if>
      <!-- Other types are formatted based on presence of 'container-title' -->
      <else-if variable="container-title">
        <!-- Quotes, title case -->
        <text quotes="true" text-case="title" variable="title"/>
      </else-if>
      <else-if match="any" type="article dataset document interview manuscript paper-conference personal_communication speech">
        <!-- Container-like but not necessarily with 'container-title' -->
        <!-- Quotes, title case -->
        <text quotes="true" text-case="title" variable="title"/>
      </else-if>
      <else>
        <!-- Italicized, title case (default) -->
        <text font-style="italic" text-case="title" variable="title"/>
      </else>
    </choose>
  </macro>
  <macro name="title-primary-short">
    <choose>
      <if match="any" type="bill collection legislation regulation treaty">
        <!-- No italics or quotes, title case -->
        <text form="short" text-case="title" variable="title"/>
      </if>
      <else-if type="legal_case">
        <!-- Italicized, sentence case -->
        <text font-style="italic" form="short" variable="title"/>
      </else-if>
      <else-if match="any" type="book classic graphic hearing map periodical">
        <!-- Italicized, title case (regardless of 'container-title') -->
        <text font-style="italic" form="short" text-case="title" variable="title"/>
      </else-if>
      <else-if type="post">
        <!-- Quotes, sentence case -->
        <text form="short" quotes="true" variable="title"/>
      </else-if>
      <!-- Other types are formatted based on presence of 'container-title' -->
      <else-if variable="container-title">
        <!-- Quotes, title case -->
        <text form="short" quotes="true" text-case="title" variable="title"/>
      </else-if>
      <else-if match="any" type="article dataset document interview manuscript paper-conference personal_communication speech">
        <!-- Container-like but not necessarily with 'container-title' -->
        <!-- Quotes, title case -->
        <text form="short" quotes="true" text-case="title" variable="title"/>
      </else-if>
      <else>
        <!-- Italicized, title case (default) -->
        <text font-style="italic" form="short" text-case="title" variable="title"/>
      </else>
    </choose>
  </macro>
  <!-- 3. Supplemental Element after Title of Source (MLA 5.106-109) -->
  <macro name="supplemental-element-after-title">
    <group delimiter=", ">
      <text macro="supplemental-contributor"/>
      <text macro="supplemental-original-date"/>
      <text macro="supplemental-generic-label"/>
    </group>
  </macro>
  <!-- 3.1. Contributor (MLA 5.107) -->
  <macro name="supplemental-contributor">
    <names delimiter=", " variable="interviewer">
      <label form="verb" suffix=" " text-case="capitalize-first"/>
      <name initialize="false"/>
    </names>
  </macro>
  <!-- 3.2. Original publication date (MLA 5.108) -->
  <macro name="supplemental-original-date">
    <choose>
      <if type="personal_communication">
        <!-- date and place of composition for letters -->
        <text macro="container1-location-event"/>
      </if>
      <else-if match="any" variable="original-publisher original-publisher-place"/>
      <else-if is-uncertain-date="original-date">
        <date form="text" prefix="[" suffix="?]" variable="original-date"/>
      </else-if>
      <else>
        <date form="text" variable="original-date"/>
      </else>
    </choose>
  </macro>
  <!-- 3.3. Section of a work labeled generically (MLA 5.109) -->
  <macro name="supplemental-generic-label">
    <choose>
      <if match="any" type="review review-book" variable="reviewed-author reviewed-genre reviewed-title">
        <text macro="supplemental-generic-label-review"/>
      </if>
      <else-if type="thesis"/>
      <else-if variable="number"/>
      <else>
        <text text-case="capitalize-first" variable="genre"/>
      </else>
    </choose>
  </macro>
  <macro name="supplemental-generic-label-short">
    <choose>
      <if match="any" type="review review-book" variable="reviewed-author reviewed-genre reviewed-title">
        <text macro="supplemental-generic-label-review-short"/>
      </if>
      <else>
        <text form="short" text-case="capitalize-first" variable="genre"/>
      </else>
    </choose>
  </macro>
  <!-- Generic label elements -->
  <macro name="supplemental-generic-label-review">
    <group delimiter=" ">
      <choose>
        <if variable="reviewed-genre">
          <text term="review-of" text-case="capitalize-first"/>
          <text variable="reviewed-genre"/>
          <choose>
            <if match="none" variable="reviewed-title">
              <names variable="reviewed-author">
                <label form="verb" suffix=" "/>
                <name initialize="false"/>
              </names>
            </if>
          </choose>
        </if>
        <else-if variable="number">
          <text term="review-of" text-case="capitalize-first"/>
        </else-if>
        <!-- If no 'reviewed-genre', assume that 'genre' is entered as 'Review of the book' or similar -->
        <else-if variable="genre">
          <text text-case="capitalize-first" variable="genre"/>
        </else-if>
        <else>
          <text term="review-of" text-case="capitalize-first"/>
        </else>
      </choose>
      <choose>
        <if match="any" variable="reviewed-genre reviewed-title">
          <!-- Not possible to distinguish TV series episode from other reviewed works without a reviewed source title -->
          <!-- Adapt for 'reviewed-container-title' or similar if it becomes available -->
          <text font-style="italic" text-case="title" variable="reviewed-title"/>
        </if>
        <else>
          <!-- Assume title is title of reviewed work -->
          <text font-style="italic" text-case="title" variable="title"/>
        </else>
      </choose>
    </group>
    <choose>
      <if variable="reviewed-genre reviewed-title title">
        <names variable="reviewed-author">
          <label form="verb" suffix=" "/>
          <name initialize="false"/>
        </names>
      </if>
      <else-if variable="reviewed-genre"/>
      <else>
        <names variable="reviewed-author">
          <label form="verb" suffix=" "/>
          <name initialize="false"/>
        </names>
      </else>
    </choose>
  </macro>
  <macro name="supplemental-generic-label-review-short">
    <group delimiter=" ">
      <text term="review-of"/>
      <choose>
        <if match="any" variable="reviewed-genre reviewed-title">
          <!-- Not possible to distinguish TV series episode from other reviewed works without a reviewed source title -->
          <!-- Adapt for 'reviewed-container-title' or similar if it becomes available -->
          <text font-style="italic" form="short" text-case="title" variable="reviewed-title"/>
        </if>
        <else>
          <!-- Assume title is title of reviewed work -->
          <text font-style="italic" form="short" text-case="title" variable="title"/>
        </else>
      </choose>
    </group>
  </macro>
  <!-- 4. Container 1 -->
  <macro name="container1">
    <group delimiter=", ">
      <text macro="container1-title"/>
      <text macro="container1-contributor"/>
      <text macro="container1-version"/>
      <text macro="container1-number"/>
      <text macro="container1-publisher"/>
      <text macro="container1-publication-date"/>
      <text macro="container1-location"/>
    </group>
  </macro>
  <!-- 4.1. Title of Container (MLA 5.31-37) -->
  <macro name="container1-title">
    <choose>
      <if match="any" type="article-journal article-magazine article-newspaper periodical post-weblog review review-book">
        <!-- serial types -->
        <text macro="container1-title-serial"/>
      </if>
      <else-if match="any" variable="collection-editor compiler editor editorial-director">
        <!-- monographic types -->
        <text macro="container1-title-monographic"/>
      </else-if>
      <else-if match="any" type="interview paper-conference">
        <!-- serial types -->
        <text macro="container1-title-serial"/>
      </else-if>
      <else>
        <!-- monographic types -->
        <text macro="container1-title-monographic"/>
      </else>
    </choose>
  </macro>
  <macro name="container1-title-serial">
    <group delimiter=", ">
      <text font-style="italic" text-case="title" variable="volume-title"/>
      <group delimiter=" ">
        <choose>
          <!-- Journal special issues and supplements (MLA 7.4) -->
          <if match="none" variable="container-title"/>
          <else-if variable="supplement-number volume-title">
            <text term="supplement"/>
            <text value="to"/>
          </else-if>
          <else-if type="periodical" variable="supplement-number title">
            <text term="supplement" text-case="capitalize-first"/>
            <text value="to"/>
          </else-if>
          <else-if type="periodical" variable="volume-title">
            <text term="special-issue" text-case="capitalize-first"/>
            <text value="of"/>
          </else-if>
          <else-if type="periodical" variable="title">
            <text term="special-issue" text-case="capitalize-first"/>
            <text value="of"/>
          </else-if>
          <else-if variable="volume-title">
            <text term="special-issue"/>
            <text value="of"/>
          </else-if>
        </choose>
        <text font-style="italic" text-case="title" variable="container-title"/>
        <text prefix="[" suffix="]" variable="publisher-place"/>
      </group>
    </group>
  </macro>
  <macro name="container1-title-monographic">
    <choose>
      <if variable="container-title part-title">
        <text font-style="italic" text-case="title" variable="part-title"/>
      </if>
      <else-if variable="container-title volume-title">
        <text font-style="italic" text-case="title" variable="volume-title"/>
      </else-if>
      <else>
        <text font-style="italic" text-case="title" variable="container-title"/>
      </else>
    </choose>
  </macro>
  <!-- 4.2. Contributor (MLA 5.38-47) -->
  <macro name="container1-contributor">
    <group delimiter=", ">
      <names delimiter=", " variable="container-author">
        <label form="verb" suffix=" "/>
        <name initialize="false"/>
      </names>
      <choose>
        <if variable="container-title">
          <names delimiter=", " variable="editor-translator">
            <label form="verb" suffix=" "/>
            <name initialize="false"/>
          </names>
          <names delimiter=", " variable="editor translator">
            <label form="verb" suffix=" "/>
            <name initialize="false"/>
          </names>
          <names delimiter=", " variable="director series-creator illustrator host narrator contributor">
            <label form="verb" suffix=" "/>
            <name initialize="false"/>
          </names>
        </if>
        <else>
          <names delimiter=", " variable="editor-translator">
            <label form="verb" suffix=" " text-case="capitalize-first"/>
            <name initialize="false"/>
          </names>
          <names delimiter=", " variable="editor translator">
            <label form="verb" suffix=" " text-case="capitalize-first"/>
            <name initialize="false"/>
          </names>
          <names delimiter=", " variable="director series-creator illustrator host narrator contributor">
            <label form="verb" suffix=" " text-case="capitalize-first"/>
            <name initialize="false"/>
          </names>
        </else>
      </choose>
    </group>
  </macro>
  <!-- 4.3. Version (MLA 5.48-50) -->
  <macro name="container1-version">
    <group delimiter=", ">
      <text macro="label-edition-capitalized"/>
      <choose>
        <if variable="edition">
          <text macro="label-version"/>
        </if>
        <else>
          <text macro="label-version-capitalized"/>
        </else>
      </choose>
    </group>
  </macro>
  <!-- 4.4. Number (MLA 5.51-53) -->
  <macro name="container1-number">
    <group delimiter=", ">
      <choose>
        <!-- 'collection-title' is for any serial with multiple series (e.g. 'second series') -->
        <if match="any" type="article-journal article-magazine article-newspaper periodical post-weblog review review-book">
          <!-- serial types -->
          <text variable="collection-title"/>
          <text macro="label-volume"/>
        </if>
        <else-if match="any" variable="collection-editor compiler editor editorial-director">
          <!-- monographic types -->
          <text macro="label-volume"/>
        </else-if>
        <else-if match="any" type="interview paper-conference">
          <!-- serial types -->
          <text variable="collection-title"/>
          <text macro="label-volume"/>
        </else-if>
        <!-- in monographic types, lowercase with a preceding element -->
        <else-if match="any" variable="part-title volume-title">
          <!-- monographic types -->
          <text macro="label-volume"/>
        </else-if>
        <else-if match="any" variable="edition container-title">
          <text macro="label-volume"/>
        </else-if>
        <!--other contributors preceding the volume-->
        <else-if variable="author">
          <choose>
            <if match="any" variable="container-author contributor director editor editor-translator illustrator interviewer translator">
              <text macro="label-volume"/>
            </if>
          </choose>
        </else-if>
        <else>
          <text macro="label-volume-capitalized"/>
        </else>
      </choose>
      <text macro="label-issue"/>
      <text macro="label-supplement-number"/>
      <group delimiter=" ">
        <choose>
          <if is-numeric="number" type="broadcast" variable="genre">
            <text variable="genre"/>
            <text variable="number"/>
          </if>
          <else-if is-numeric="number" type="broadcast">
            <text value="episode"/>
            <text variable="number"/>
          </else-if>
          <else-if variable="number">
            <text variable="genre"/>
            <text macro="label-number"/>
          </else-if>
        </choose>
      </group>
    </group>
  </macro>
  <!-- 4.5. Publisher (MLA 5.54-67) -->
  <macro name="container1-publisher">
    <choose>
      <if type="thesis"/>
      <!-- omit serial types -->
      <else-if match="any" type="article-journal article-magazine article-newspaper periodical post-weblog review review-book"/>
      <else-if match="any" variable="collection-editor compiler editor editorial-director">
        <!-- monographic types -->
        <text macro="container1-publisher-or-place"/>
      </else-if>
      <!-- omit serial types -->
      <else-if match="any" type="interview paper-conference"/>
      <else>
        <!-- monographic types -->
        <text macro="container1-publisher-or-place"/>
      </else>
    </choose>
  </macro>
  <macro name="container1-publisher-or-place">
    <choose>
      <if variable="publisher">
        <text variable="publisher"/>
      </if>
      <else>
        <!-- use place of publication as fallback (cf. MLA 5.67) -->
        <text variable="publisher-place"/>
      </else>
    </choose>
  </macro>
  <!-- 4.6. Publication Date (MLA 5.68-83) -->
  <macro name="container1-publication-date">
    <choose>
      <if match="any" type="book chapter motion_picture paper-conference thesis">
        <choose>
          <if is-uncertain-date="issued">
            <date date-parts="year" form="numeric" prefix="[" suffix="?]" variable="issued"/>
          </if>
          <else>
            <date date-parts="year" form="numeric" variable="issued"/>
          </else>
        </choose>
      </if>
      <else-if type="article-journal">
        <choose>
          <if is-uncertain-date="issued">
            <date date-parts="year-month" form="text" prefix="[" suffix="?]" variable="issued"/>
          </if>
          <else>
            <date date-parts="year-month" form="text" variable="issued"/>
          </else>
        </choose>
      </else-if>
      <else-if type="speech"/>
      <else>
        <choose>
          <if is-uncertain-date="issued">
            <group delimiter=" ">
              <text term="circa" text-case="capitalize-first"/>
              <date form="text" variable="issued"/>
            </group>
          </if>
          <else>
            <date form="text" variable="issued"/>
          </else>
        </choose>
      </else>
    </choose>
  </macro>
  <!-- 4.7. Location (MLA 5.84-99) -->
  <macro name="container1-location">
    <!-- location of a physical object or event (MLA 5.99) -->
    <group delimiter=", ">
      <choose>
        <!-- serials cannot be part of an event -->
        <if match="any" type="article-journal article-magazine article-newspaper periodical post-weblog review review-book"/>
        <!-- 'event-date' supplies date of composition for letters, handled in 'supplemental-original-date' -->
        <else-if type="personal_communication"/>
        <else-if type="paper-conference">
          <choose>
            <if match="none" variable="collection-editor compiler editor editorial-director issue page supplement-number volume">
              <!-- Don't print event info for conference papers published in a proceedings volume -->
              <text macro="container1-location-event"/>
            </if>
          </choose>
        </else-if>
        <else>
          <!-- For other item types, print event info even if published (e.g. collection catalogs, performance programs). -->
          <text macro="container1-location-event"/>
        </else>
      </choose>
      <text variable="archive"/>
      <text variable="archive-place"/>
      <text variable="archive_collection"/>
      <text variable="archive_location"/>
      <text macro="label-page"/>
      <choose>
        <if match="none" variable="source">
          <text macro="container1-location-URI"/>
        </if>
      </choose>
    </group>
  </macro>
  <macro name="container1-location-event">
    <group delimiter=", ">
      <choose>
        <if match="any" variable="event event-date event-title">
          <!-- TODO: We expect 'event-title' to be used, but processors and applications may not be updated yet. This macro ensures that either 'event' or 'event-title' can be accepted. Remove if processor logic and application adoption can handle this. -->
          <choose>
            <if variable="event-title">
              <text text-case="capitalize-first" variable="event-title"/>
            </if>
            <else>
              <text text-case="capitalize-first" variable="event"/>
            </else>
          </choose>
          <choose>
            <if is-uncertain-date="event-date">
              <date form="text" prefix="[" suffix="?]" variable="event-date"/>
            </if>
            <else>
              <date form="text" variable="event-date"/>
            </else>
          </choose>
          <text variable="event-place"/>
        </if>
      </choose>
    </group>
  </macro>
  <macro name="container1-location-URI">
    <choose>
      <if variable="DOI">
        <text prefix="https://doi.org/" variable="DOI"/>
      </if>
      <else>
        <text variable="URL"/>
      </else>
    </choose>
  </macro>
  <!-- 5. Supplemental Element Between Containers (MLA 5.119) -->
  <macro name="supplemental-element-between">
    <choose>
      <if variable="source">
        <text macro="supplemental-element-movable"/>
      </if>
    </choose>
  </macro>
  <!-- 6. Container 2 (MLA 5.102) -->
  <macro name="container2">
    <group delimiter=", ">
      <choose>
        <if match="none" variable="source"/>
        <else-if match="any" variable="DOI URL">
          <!-- Title of Container -->
          <text font-style="italic" variable="source"/>
          <!-- Location -->
          <text macro="container1-location-URI"/>
        </else-if>
      </choose>
    </group>
  </macro>
  <!-- 7. Supplemental Element at End of Entry (MLA 5.110-118) -->
  <macro name="supplemental-element-end">
    <group delimiter=", ">
      <text macro="supplemental-date-access"/>
      <text macro="supplemental-medium"/>
      <choose>
        <if variable="source"/>
        <else>
          <text macro="supplemental-element-movable"/>
        </else>
      </choose>
    </group>
  </macro>
  <macro name="supplemental-element-movable">
    <!-- information relevant only to one container appears either in 'supplemental-element-between' or 'supplemental-element-end' depending on the presence of 'source' -->
    <group delimiter=", ">
      <choose>
        <if match="any" type="article-journal article-magazine article-newspaper periodical post-weblog review review-book">
          <!-- serial types -->
          <text macro="supplemental-columns-sections"/>
        </if>
        <else-if match="any" type="interview paper-conference">
          <choose>
            <if match="any" variable="collection-editor compiler editor editorial-director">
              <!-- monographic types -->
              <text macro="supplemental-dissertations-theses"/>
              <text macro="supplemental-publication-history"/>
              <text macro="supplemental-book-series"/>
              <text macro="supplemental-multivolume-works"/>
            </if>
            <else>
              <!-- serial types -->
              <text macro="supplemental-columns-sections"/>
            </else>
          </choose>
        </else-if>
        <else>
          <!-- monographic types -->
          <text macro="supplemental-dissertations-theses"/>
          <text macro="supplemental-publication-history"/>
          <text macro="supplemental-book-series"/>
          <text macro="supplemental-multivolume-works"/>
        </else>
      </choose>
    </group>
  </macro>
  <!-- 7.1. Date of access (MLA 5.111) -->
  <macro name="supplemental-date-access">
    <choose>
      <if match="none" variable="issued">
        <group delimiter=" ">
          <text term="accessed" text-case="capitalize-first"/>
          <date form="text" variable="accessed"/>
        </group>
      </if>
    </choose>
  </macro>
  <!-- 7.2. Medium of publication (MLA 5.112) -->
  <macro name="supplemental-medium">
    <text text-case="capitalize-first" variable="medium"/>
  </macro>
  <!-- 7.3. Dissertations and theses (MLA 5.113) -->
  <macro name="supplemental-dissertations-theses">
    <choose>
      <if type="thesis">
        <group delimiter=", ">
          <text variable="publisher"/>
          <text variable="genre"/>
        </group>
      </if>
    </choose>
  </macro>
  <!-- 7.4. Publication history (MLA 5.114) -->
  <macro name="supplemental-publication-history">
    <group delimiter=" ">
      <choose>
        <if match="any" variable="original-publisher original-publisher-place original-title">
          <text term="original-work-published" text-case="capitalize-first"/>
        </if>
      </choose>
      <group delimiter=", ">
        <group delimiter=" ">
          <text value="as"/>
          <text font-style="italic" text-case="title" variable="original-title"/>
        </group>
        <choose>
          <if match="any" variable="original-publisher original-publisher-place">
            <choose>
              <if variable="original-publisher">
                <group delimiter=" ">
                  <choose>
                    <if match="none" variable="original-title">
                      <text term="by"/>
                    </if>
                  </choose>
                  <text variable="original-publisher"/>
                </group>
              </if>
              <else>
                <text variable="original-publisher-place"/>
              </else>
            </choose>
            <choose>
              <if is-uncertain-date="original-date">
                <date date-parts="year" form="numeric" prefix="[" suffix="?]" variable="original-date"/>
              </if>
              <else>
                <date date-parts="year" form="numeric" variable="original-date"/>
              </else>
            </choose>
          </if>
        </choose>
      </group>
    </group>
  </macro>
  <!-- 7.5. Book series (MLA 5.115) -->
  <macro name="supplemental-book-series">
    <group delimiter=", ">
      <choose>
        <if is-numeric="collection-number" variable="collection-title">
          <group delimiter=" ">
            <text text-case="title" variable="collection-title"/>
            <text variable="collection-number"/>
          </group>
        </if>
        <else-if variable="collection-title">
          <text text-case="title" variable="collection-title"/>
          <text variable="collection-number"/>
        </else-if>
      </choose>
    </group>
  </macro>
  <!-- 7.6. Columns, sections, and other recurring titled features (MLA 5.116) -->
  <macro name="supplemental-columns-sections">
    <text text-case="title" variable="section"/>
  </macro>
  <!-- 7.7. Multivolume works (MLA 5.117) -->
  <macro name="supplemental-multivolume-works">
    <group delimiter=", ">
      <choose>
        <if variable="part-number part-title volume volume-title">
          <!-- part and title with individual titles -->
          <group delimiter=" ">
            <text macro="label-part-number-capitalized"/>
            <text value="of"/>
            <text font-style="italic" text-case="title" variable="volume-title"/>
          </group>
          <group delimiter=" ">
            <text macro="label-volume"/>
            <text value="of"/>
            <group delimiter=", ">
              <choose>
                <if variable="container-title">
                  <text font-style="italic" text-case="title" variable="container-title"/>
                </if>
                <else>
                  <text macro="title-primary"/>
                </else>
              </choose>
              <names variable="collection-editor">
                <name initialize="false"/>
                <label prefix=", "/>
              </names>
            </group>
          </group>
        </if>
        <else-if match="any" variable="part-title volume-title">
          <group delimiter=" ">
            <choose>
              <if variable="part-number volume">
                <group delimiter=", ">
                  <text macro="label-volume-capitalized"/>
                  <text macro="label-part-number"/>
                  <text value="of"/>
                </group>
              </if>
              <else-if variable="part-number">
                <text macro="label-part-number-capitalized"/>
                <text value="of"/>
              </else-if>
              <else-if variable="volume">
                <text macro="label-volume-capitalized"/>
                <text value="of"/>
              </else-if>
            </choose>
            <group delimiter=", ">
              <choose>
                <if variable="container-title">
                  <text font-style="italic" text-case="title" variable="container-title"/>
                </if>
                <else>
                  <text macro="title-primary"/>
                </else>
              </choose>
              <names variable="collection-editor">
                <name initialize="false"/>
                <label prefix=", "/>
              </names>
            </group>
          </group>
        </else-if>
        <!-- numbers without a volume title appear in 'container1-number' -->
      </choose>
      <choose>
        <if match="none" variable="volume">
          <text macro="label-number-of-volumes"/>
        </if>
      </choose>
      <!-- TODO: provide container date here when available -->
    </group>
  </macro>
  <citation disambiguate-add-givenname="true" disambiguate-add-names="true" et-al-min="3" et-al-use-first="1">
    <layout delimiter="; " prefix="(" suffix=")">
      <choose>
        <if locator="line page timestamp" match="any">
          <group delimiter=" ">
            <text macro="author-short"/>
            <text variable="locator"/>
          </group>
        </if>
        <else>
          <group delimiter=", ">
            <text macro="author-short"/>
            <text macro="label-locator"/>
          </group>
        </else>
      </choose>
    </layout>
  </citation>
  <bibliography entry-spacing="0" et-al-min="3" et-al-use-first="1" hanging-indent="true" line-spacing="2" subsequent-author-substitute="&#8212;&#8212;&#8212;">
    <sort>
      <key macro="author"/>
      <key macro="title"/>
      <key macro="supplemental-element-after-title"/>
      <key macro="container1"/>
      <key macro="supplemental-element-between"/>
      <key macro="container2"/>
      <key macro="supplemental-element-end"/>
    </sort>
    <layout suffix=".">
      <group delimiter=". ">
        <text macro="author"/>
        <text macro="title"/>
        <text macro="supplemental-element-after-title"/>
        <text macro="container1"/>
        <text macro="supplemental-element-between"/>
        <text macro="container2"/>
        <text macro="supplemental-element-end"/>
      </group>
    </layout>
  </bibliography>
</style>`;
